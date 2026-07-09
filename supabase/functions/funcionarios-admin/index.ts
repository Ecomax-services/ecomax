// Edge Function: funcionarios-admin
// Operações privilegiadas de Gestão de Usuários que exigem service_role (criar login no Auth,
// resetar senha, bloquear login). Valida o JWT do chamador e a permissão do módulo antes de agir.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'Não autenticado' }, 401);

  // Cliente com o JWT do chamador (para checar permissão via RLS/rpc no contexto do usuário).
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const caller = userData?.user;
  if (!caller) return json({ error: 'Sessão inválida' }, 401);

  // Cliente admin (service_role) para operações no Auth.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corpo inválido' }, 400);
  }
  const action: string = payload?.action;

  const need = async (acao: string) => {
    const { data, error } = await userClient.rpc('has_module_perm', {
      _modulo: 'gestao_usuarios',
      _acao: acao,
    });
    if (error) throw new Error(error.message);
    return data === true;
  };

  const audit = (funcionario_id: string | null, acao: string, detalhes: unknown, justificativa?: string) =>
    admin.from('auditoria').insert({
      actor_id: caller.id,
      funcionario_id,
      acao,
      detalhes,
      justificativa: justificativa ?? null,
    });

  try {
    // Cria o login (auth user) + profile e devolve o id. Reutilizável por create e link_access.
    const provisionLogin = async (acesso: any, funcionarioNome: string) => {
      const senha = acesso.senha_provisoria || `Ec0max!${Math.random().toString(36).slice(2, 8)}`;
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: String(acesso.email).trim(),
        password: senha,
        email_confirm: true,
        user_metadata: { nome_completo: funcionarioNome },
      });
      if (cErr || !created?.user) throw new Error(cErr?.message || 'Falha ao criar login');
      const uid = created.user.id;
      // O trigger handle_new_user cria a linha em profiles; atualizamos os campos de negócio.
      const { error: pErr } = await admin
        .from('profiles')
        .update({
          nome_completo: funcionarioNome,
          role: acesso.role ?? 'operacional',
          perfil_acesso_id: acesso.perfil_acesso_id ?? null,
          ativo: true,
        })
        .eq('id', uid);
      if (pErr) throw new Error(pErr.message);
      // Envia e-mail para o usuário definir a própria senha (best-effort; depende de SMTP).
      await admin.auth.resetPasswordForEmail(String(acesso.email).trim()).catch(() => {});
      return uid;
    };

    if (action === 'create') {
      if (!(await need('criar'))) return json({ error: 'Sem permissão para criar' }, 403);
      const f = payload.funcionario ?? {};
      let profile_id: string | null = null;
      if (payload.acesso?.email) profile_id = await provisionLogin(payload.acesso, f.nome_completo);
      const { data: inserted, error } = await admin
        .from('funcionarios')
        .insert({ ...f, profile_id, created_by: caller.id })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      await audit(inserted.id, 'funcionario_criado', { com_acesso: !!profile_id });
      return json({ id: inserted.id, profile_id });
    }

    if (action === 'link_access') {
      if (!(await need('criar'))) return json({ error: 'Sem permissão' }, 403);
      const { funcionario_id, acesso, nome } = payload;
      const uid = await provisionLogin(acesso, nome);
      const { error } = await admin.from('funcionarios').update({ profile_id: uid }).eq('id', funcionario_id);
      if (error) throw new Error(error.message);
      await audit(funcionario_id, 'acesso_vinculado', { email: acesso.email });
      return json({ ok: true, profile_id: uid });
    }

    if (action === 'reset_password') {
      if (!(await need('editar'))) return json({ error: 'Sem permissão' }, 403);
      const { funcionario_id, email } = payload;
      const { error } = await admin.auth.resetPasswordForEmail(String(email).trim());
      if (error) throw new Error(error.message);
      await audit(funcionario_id, 'senha_redefinida', { email });
      return json({ ok: true });
    }

    if (action === 'set_block') {
      if (!(await need('editar'))) return json({ error: 'Sem permissão' }, 403);
      const { funcionario_id, profile_id, bloquear, justificativa } = payload;
      const { error } = await admin.auth.admin.updateUserById(profile_id, {
        ban_duration: bloquear ? '876000h' : 'none',
      });
      if (error) throw new Error(error.message);
      await audit(funcionario_id, bloquear ? 'login_bloqueado' : 'login_desbloqueado', { profile_id }, justificativa);
      return json({ ok: true });
    }

    return json({ error: 'Ação desconhecida' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
