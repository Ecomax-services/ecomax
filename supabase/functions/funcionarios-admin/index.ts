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

// Para onde o link de definir senha aponta. Sem isto o Supabase manda todo mundo
// para o Site URL — ou seja, o operador e o cliente cairiam no Backoffice, onde
// nem têm acesso, e o primeiro acesso deles morre ali.
// Configurar com: supabase secrets set APP_URL_BACKOFFICE=... (ver docs/deploy-vercel.md)
const APP_URLS: Record<string, string | undefined> = {
  backoffice: Deno.env.get('APP_URL_BACKOFFICE'),
  portal_cliente: Deno.env.get('APP_URL_PORTAL'),
  mobile_operador: Deno.env.get('APP_URL_MOBILE'),
};

// Espelha public.apps_for_role. Mantido em código, e não por RPC, porque aqui
// já temos o role em mãos e uma ida ao banco por e-mail enviado não paga.
const appDoRole = (role?: string | null) =>
  role === 'cliente' ? 'portal_cliente' : role === 'operador' ? 'mobile_operador' : 'backoffice';

/**
 * Dispara o e-mail de definição de senha para o app certo.
 * Devolve o motivo da falha em vez de lançar: criar o usuário e falhar o e-mail
 * são coisas diferentes, e quem chamou precisa saber qual das duas aconteceu.
 */
async function enviarLinkDeSenha(
  admin: ReturnType<typeof createClient>,
  email: string,
  role?: string | null,
): Promise<{ enviado: boolean; motivo?: string }> {
  const app = appDoRole(role);
  const base = APP_URLS[app];

  if (!base && app !== 'backoffice') {
    // Sem redirectTo o Supabase manda para o Site URL, que é o Backoffice.
    // Para operador e cliente isso é pior do que não enviar: eles receberiam um
    // link para um sistema onde não têm acesso e ficariam achando que o problema
    // é a senha. Melhor falhar dizendo o que configurar.
    return { enviado: false, motivo: `APP_URL_${app === 'portal_cliente' ? 'PORTAL' : 'MOBILE'} não configurada nas secrets da função` };
  }

  // Para o Backoffice o fallback é inofensivo: o Site URL já é ele. Fica só o
  // aviso, para a secret não passar despercebida.
  if (!base) console.warn('APP_URL_BACKOFFICE não configurada; usando o Site URL do projeto');

  const { error } = await admin.auth.resetPasswordForEmail(
    email.trim(),
    base ? { redirectTo: `${base.replace(/\/$/, '')}/criar-senha` } : undefined,
  );
  if (error) {
    console.error('falha ao enviar link de senha', { email, app, erro: error.message });
    return { enviado: false, motivo: error.message };
  }
  return { enviado: true };
}

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

  const need = async (acao: string, modulo = 'gestao_usuarios') => {
    const { data, error } = await userClient.rpc('has_module_perm', {
      _modulo: modulo,
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
      // O e-mail é best-effort — a conta já existe e não seria certo desfazê-la
      // por causa do envio. Mas o resultado sobe junto na resposta: antes daqui
      // um `.catch(() => {})` engolia a falha, e o usuário era criado sem nunca
      // receber nada, sem ninguém ficar sabendo.
      const envio = await enviarLinkDeSenha(admin, String(acesso.email), acesso.role);
      return { uid, envio };
    };

    if (action === 'create') {
      if (!(await need('criar'))) return json({ error: 'Sem permissão para criar' }, 403);
      const f = payload.funcionario ?? {};
      let profile_id: string | null = null;
      let envio: { enviado: boolean; motivo?: string } | undefined;
      if (payload.acesso?.email) {
        const r = await provisionLogin(payload.acesso, f.nome_completo);
        profile_id = r.uid;
        envio = r.envio;
      }
      const { data: inserted, error } = await admin
        .from('funcionarios')
        .insert({ ...f, profile_id, created_by: caller.id })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      await audit(inserted.id, 'funcionario_criado', { com_acesso: !!profile_id, email_enviado: envio?.enviado });
      return json({ id: inserted.id, profile_id, email_enviado: envio?.enviado, email_erro: envio?.motivo });
    }

    if (action === 'link_access') {
      if (!(await need('criar'))) return json({ error: 'Sem permissão' }, 403);
      const { funcionario_id, acesso, nome } = payload;
      const { uid, envio } = await provisionLogin(acesso, nome);
      const { error } = await admin.from('funcionarios').update({ profile_id: uid }).eq('id', funcionario_id);
      if (error) throw new Error(error.message);
      await audit(funcionario_id, 'acesso_vinculado', { email: acesso.email, email_enviado: envio.enviado });
      return json({ ok: true, profile_id: uid, email_enviado: envio.enviado, email_erro: envio.motivo });
    }

    if (action === 'reset_password') {
      if (!(await need('editar'))) return json({ error: 'Sem permissão' }, 403);
      const { funcionario_id, email, profile_id } = payload;
      // O papel decide o app de destino. Se não veio no payload, busca — mandar
      // um operador para o Backoffice é o mesmo que não mandar e-mail nenhum.
      let role: string | null = payload.role ?? null;
      if (!role && profile_id) {
        const { data: p } = await admin.from('profiles').select('role').eq('id', profile_id).maybeSingle();
        role = p?.role ?? null;
      }
      const envio = await enviarLinkDeSenha(admin, String(email), role);
      if (!envio.enviado) throw new Error(envio.motivo || 'Falha ao enviar o e-mail');
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

    /**
     * Convite de usuário do Portal do Cliente.
     *
     * A tela de Gestão de Clientes só inseria a linha em cliente_portal_usuarios
     * e avisava "envio de e-mail em breve". Ninguém recebia nada, e não havia
     * login: a pessoa convidada não tinha como entrar. Aqui o convite passa a
     * fazer as três coisas de uma vez — cria o acesso, aponta o papel para
     * `cliente` e dispara o e-mail para o Portal.
     */
    if (action === 'invite_portal') {
      if (!(await need('criar', 'gestao_clientes'))) {
        return json({ error: 'Sem permissão para convidar usuários do portal' }, 403);
      }
      const { cliente_id, nome, email, perfil } = payload;
      const mail = String(email ?? '').trim().toLowerCase();
      if (!cliente_id || !mail) return json({ error: 'Informe cliente e e-mail.' }, 400);

      // Reaproveita a conta quando o e-mail já existe: a mesma pessoa pode ser
      // convidada por mais de um cliente, e criar duas contas com o mesmo
      // e-mail falharia no Auth.
      const { data: existentes } = await admin.auth.admin.listUsers();
      let uid = existentes?.users?.find((u) => u.email?.toLowerCase() === mail)?.id ?? null;

      if (!uid) {
        const { data: criado, error: cErr } = await admin.auth.admin.createUser({
          email: mail,
          password: crypto.randomUUID(),   // descartada: a pessoa define a dela pelo link
          email_confirm: true,
          user_metadata: { nome_completo: nome ?? mail },
        });
        if (cErr || !criado?.user) throw new Error(cErr?.message || 'Falha ao criar o acesso');
        uid = criado.user.id;
      }

      const { error: pErr } = await admin
        .from('profiles')
        .update({ nome_completo: nome ?? mail, role: 'cliente', ativo: true, cliente_id })
        .eq('id', uid);
      if (pErr) throw new Error(pErr.message);

      // O vínculo é por e-mail (é o que my_portal_cliente_ids consulta), então
      // reconvidar o mesmo endereço atualiza em vez de duplicar.
      const { data: jaVinculado } = await admin
        .from('cliente_portal_usuarios')
        .select('id')
        .eq('cliente_id', cliente_id)
        .ilike('email', mail)
        .maybeSingle();

      if (jaVinculado) {
        await admin
          .from('cliente_portal_usuarios')
          .update({ nome: nome ?? mail, perfil: perfil ?? 'Usuário', status: 'convidado' })
          .eq('id', jaVinculado.id);
      } else {
        const { error: vErr } = await admin.from('cliente_portal_usuarios').insert({
          cliente_id, nome: nome ?? mail, email: mail, perfil: perfil ?? 'Usuário', status: 'convidado',
        });
        if (vErr) throw new Error(vErr.message);
      }

      const envio = await enviarLinkDeSenha(admin, mail, 'cliente');
      await admin.from('auditoria').insert({
        actor_id: caller.id, funcionario_id: null, modulo: 'gestao_clientes',
        acao: 'portal_usuario_convidado',
        detalhes: { cliente_id, email: mail, email_enviado: envio.enviado },
      });

      return json({ ok: true, profile_id: uid, email_enviado: envio.enviado, email_erro: envio.motivo });
    }

    return json({ error: 'Ação desconhecida' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
