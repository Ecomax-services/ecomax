import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';

interface Garantia {
  cliente: string;
  os: string;
  data_execucao: string | null;
  data_validade: string;
  servicos: string[];
  ja_respondido: boolean;
  resposta: string | null;
}

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/garantia-publica`;
const brDate = (iso: string | null) => (iso ? iso.split('T')[0].split('-').reverse().join('/') : '—');

const OPCOES = [
  { key: 'renovar', label: 'Quero renovar', icon: CheckCircle2, tom: 'bg-forest-500 text-white' },
  { key: 'contato', label: 'Quero falar com um consultor', icon: MessageSquare, tom: 'border border-ink-200 bg-white text-ink-800' },
  { key: 'recusar', label: 'Não vou renovar', icon: XCircle, tom: 'border border-ink-200 bg-white text-ink-800' },
] as const;

/**
 * Tela 5.2.2 - Renovação de garantia por link público.
 *
 * Sem login: o token no endereço é a credencial. Toda a validação acontece na
 * Edge Function; aqui não há client do Supabase autenticado nem acesso a
 * tabela — a página não sabe nada além do que a função devolve.
 */
export function GarantiaPublica() {
  const { token = '' } = useParams();
  const [g, setG] = useState<Garantia | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respondido, setRespondido] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`${FN}?token=${encodeURIComponent(token)}`);
      const body = await r.json();
      if (!r.ok) { setErro(body.error ?? 'Link inválido.'); return; }
      setG(body);
      if (body.ja_respondido) setRespondido(body.resposta);
    } catch {
      setErro('Não foi possível carregar. Verifique sua conexão.');
    }
  }, [token]);

  useEffect(() => { carregar(); }, [carregar]);

  const responder = async (resposta: string) => {
    if (enviando) return;
    setEnviando(true);
    try {
      const r = await fetch(FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, resposta }),
      });
      const body = await r.json();
      if (!r.ok) { setErro(body.error ?? 'Não foi possível registrar.'); return; }
      setRespondido(resposta);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-ink-50 px-4 py-10">
      <Logo className="h-10" />

      <div className="mt-8 w-full max-w-[560px] rounded-2xl bg-white p-8 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.06)]">
        {erro && (
          <div className="text-center">
            <p className="text-[17px] font-semibold text-ink-900">Não foi possível abrir</p>
            <p className="mt-2 text-sm text-ink-500">{erro}</p>
            <p className="mt-4 text-[13px] text-ink-400">
              Se o prazo do link acabou, peça um novo ao seu contato na Ecomax.
            </p>
          </div>
        )}

        {!erro && !g && <p className="text-center text-sm text-ink-400">Carregando…</p>}

        {g && (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-100">
                <ShieldCheck className="h-6 w-6 text-forest-700" />
              </span>
              <div>
                <h1 className="text-[19px] font-bold text-ink-900">Renovação de garantia</h1>
                <p className="text-[13px] text-ink-500">{g.cliente} · {g.os}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-ink-50 px-4 py-3.5">
              <Campo label="Serviço executado em" valor={brDate(g.data_execucao)} />
              <Campo label="Garantia válida até" valor={brDate(g.data_validade)} />
            </div>

            {g.servicos.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase text-ink-400">Serviços cobertos</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {g.servicos.map((s) => (
                    <li key={s} className="rounded-full bg-forest-100 px-2.5 py-1 text-[12px] font-medium text-forest-900">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {respondido ? (
              <div className="mt-7 rounded-xl bg-forest-50 px-4 py-5 text-center">
                <CheckCircle2 className="mx-auto h-7 w-7 text-forest-600" />
                <p className="mt-2 text-[15px] font-semibold text-ink-900">Resposta registrada</p>
                <p className="mt-1 text-[13px] text-ink-500">
                  {respondido === 'renovar' && 'Vamos preparar a renovação e entrar em contato.'}
                  {respondido === 'contato' && 'Um consultor entrará em contato com você.'}
                  {respondido === 'recusar' && 'Obrigado por avisar. Seguimos à disposição.'}
                </p>
              </div>
            ) : (
              <div className="mt-7">
                <p className="mb-3 text-sm font-semibold text-ink-800">Como deseja seguir?</p>
                <div className="flex flex-col gap-2">
                  {OPCOES.map((o) => {
                    const Icon = o.icon;
                    return (
                      <button
                        key={o.key}
                        onClick={() => responder(o.key)}
                        disabled={enviando}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-sm font-semibold transition disabled:opacity-60',
                          o.tom,
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-[12px] text-ink-400">
                  Sua resposta é registrada uma única vez.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-[12px] text-ink-400">Ecomax · Controle de pragas</p>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink-800">{valor}</p>
    </div>
  );
}
