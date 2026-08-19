import { useCallback, useEffect, useRef, useState } from 'react';
import { Paperclip, Upload, Trash2, Pencil, Check, X, FileText, Image, Sheet, Mail, File } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { listFupAnexos, listGarantiaAnexos, renomearAnexo, type AnexoRow } from '@/lib/comercial';
import {
  enviarAnexo, removerAnexo, abrirAnexo, validar, ehVisualizavel, extensaoDe,
  type EscopoAnexo,
} from '@/lib/comercialUploads';

const ICONE: Record<string, LucideIcon> = {
  PDF: FileText, Documento: FileText, Imagem: Image, Planilha: Sheet, 'E-mail': Mail, Outro: File,
};

/** Telas 5.1.2 e 5.2.3 — anexos, como seção do detalhe e não como modal sobreposto. */
export function Anexos({ escopo, id }: { escopo: EscopoAnexo; id: string }) {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canCreate = can('comercial', 'criar');
  const canEdit = can('comercial', 'editar');
  const canDelete = can('comercial', 'excluir');

  const [rows, setRows] = useState<AnexoRow[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    const p = escopo === 'follow-up' ? listFupAnexos(id) : listGarantiaAnexos(id);
    p.then(setRows).catch((e) => showToast((e as Error).message));
  }, [escopo, id, showToast]);
  useEffect(() => { load(); }, [load]);

  const enviar = async (files: FileList | File[]) => {
    const lista = Array.from(files);
    if (!lista.length) return;

    // Valida tudo antes de subir qualquer coisa: subir metade e falhar no resto
    // deixa a pessoa sem saber o que entrou.
    const invalidos = lista.map(validar).filter(Boolean) as string[];
    if (invalidos.length) { showToast(invalidos[0]); return; }

    setEnviando(true);
    let ok = 0;
    try {
      for (const f of lista) { await enviarAnexo(escopo, id, f); ok += 1; }
      showToast(ok === 1 ? 'Anexo enviado' : `${ok} anexos enviados`);
    } catch (e) {
      showToast(ok > 0 ? `${ok} enviado(s); ${(e as Error).message}` : (e as Error).message);
    } finally {
      setEnviando(false);
      load();
    }
  };

  const excluir = async (a: AnexoRow) => {
    try { await removerAnexo(escopo, a.id, a.arquivoUrl); showToast('Anexo excluído'); load(); }
    catch (e) { showToast((e as Error).message); }
  };

  const salvarNome = async (a: AnexoRow) => {
    if (!nomeNovo.trim()) return showToast('O nome não pode ficar vazio.');
    try {
      await renomearAnexo(escopo === 'follow-up' ? 'fup' : 'garantia', a.id, nomeNovo.trim());
      setRenomeando(null); load();
    } catch (e) { showToast((e as Error).message); }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-ink-900">
          <Paperclip className="h-4 w-4 text-ink-400" />
          Anexos
          {rows.length > 0 && <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-semibold text-ink-500">{rows.length}</span>}
        </h3>
      </div>

      {canCreate && (
        <div
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); enviar(e.dataTransfer.files); }}
          className={cn(
            'rounded-xl border border-dashed px-4 py-5 text-center transition-colors',
            arrastando ? 'border-forest-500 bg-forest-50' : 'border-ink-200 bg-ink-50/40',
          )}
        >
          <Upload className="mx-auto h-5 w-5 text-ink-400" />
          <p className="mt-1.5 text-[13px] text-ink-500">
            Arraste arquivos aqui ou{' '}
            <button onClick={() => inputRef.current?.click()} className="font-semibold text-forest-700 hover:underline">
              escolha do computador
            </button>
          </p>
          <p className="mt-0.5 text-[11px] text-ink-400">PDF, Word, imagem, planilha ou e-mail · até 10 MB cada</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) enviar(e.target.files); e.target.value = ''; }}
          />
          {enviando && <p className="mt-2 text-[13px] font-medium text-forest-700">Enviando…</p>}
        </div>
      )}

      <div className="mt-3">
        {rows.length === 0 && <p className="py-3 text-center text-[13px] text-ink-400">Nenhum anexo.</p>}
        {rows.map((a) => {
          const Icon = ICONE[a.tipo] ?? File;
          const editandoEste = renomeando === a.id;
          return (
            <div key={a.id} className="flex items-center gap-3 border-t border-ink-100 py-2.5 first:border-t-0">
              <Icon className="h-[18px] w-[18px] shrink-0 text-ink-400" />
              <div className="min-w-0 flex-1">
                {editandoEste ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={nomeNovo}
                      onChange={(e) => setNomeNovo(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') salvarNome(a); if (e.key === 'Escape') setRenomeando(null); }}
                      aria-label="Novo nome do arquivo"
                      autoFocus
                      className="min-w-0 flex-1 rounded-md border border-ink-200 px-2 py-1 text-sm outline-none"
                    />
                    <button onClick={() => salvarNome(a)} aria-label="Salvar nome" className="text-forest-700"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setRenomeando(null)} aria-label="Cancelar" className="text-ink-400"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => abrirAnexo(a.arquivoUrl)}
                    disabled={!a.arquivoUrl}
                    title={ehVisualizavel(a.nome) ? 'Abrir para visualizar' : 'Baixar'}
                    className="block max-w-full truncate text-left text-sm font-medium text-ink-800 hover:text-forest-700 disabled:cursor-default disabled:hover:text-ink-800"
                  >
                    {a.nome}
                  </button>
                )}
                <p className="text-[12px] text-ink-400">
                  {a.tipo} · {a.tamanho} · {a.criadoEm}
                  {!ehVisualizavel(a.nome) && extensaoDe(a.nome) && ' · abre para download'}
                </p>
              </div>
              {canEdit && !editandoEste && (
                <button
                  onClick={() => { setRenomeando(a.id); setNomeNovo(a.nome); }}
                  aria-label={`Renomear ${a.nome}`}
                  className="shrink-0 text-ink-400 hover:text-ink-900"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => excluir(a)}
                  aria-label={`Excluir ${a.nome}`}
                  className="shrink-0 text-ink-400 hover:text-danger-bright"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
