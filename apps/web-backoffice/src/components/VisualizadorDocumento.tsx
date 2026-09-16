/**
 * Visualizador de documento do storage.
 *
 * O protótipo abre um modal com o documento, o título e um "Baixar" — e é o
 * que esta tela faz, com a diferença de mostrar o arquivo de verdade em vez de
 * uma página desenhada.
 *
 * O bucket é privado, então nada aqui funciona com a URL crua: cada abertura
 * pede uma URL assinada, válida por uma hora. É também por isso que o download
 * não é um `<a download>` apontando para o storage — o navegador não teria
 * permissão de ler o objeto.
 */
import { useEffect, useState } from 'react';
import { Download, X, FileText, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { urlAssinadaOperacional } from '@/lib/operacional';

export interface DocumentoParaVer {
  /** Caminho no bucket `operacional-docs`. */
  caminho: string;
  titulo: string;
  /** Linha de apoio — normalmente o nome do arquivo. */
  sub: string;
}

export function VisualizadorDocumento({ doc, onClose }: { doc: DocumentoParaVer; onClose: () => void }) {
  const { showToast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setUrl(null); setErro(null); setAviso(null);
    (async () => {
      try {
        const u = await urlAssinadaOperacional(doc.caminho);
        if (!vivo) return;
        if (!u) { setErro('Não foi possível gerar o endereço do arquivo.'); return; }

        // `createSignedUrl` assina o caminho sem conferir se o objeto existe —
        // então "gerou URL" não é prova de nada. Quem responde de verdade é o
        // storage. Sem esta chamada, um registro apontando para arquivo
        // inexistente virava um quadro branco dentro do iframe.
        const r = await fetch(u);
        if (!vivo) return;
        if (!r.ok) {
          setErro(r.status === 404
            ? 'O arquivo não está no armazenamento, embora o registro exista no banco.'
            : `O armazenamento respondeu ${r.status} ao buscar o arquivo.`);
          return;
        }
        const bytes = Number(r.headers.get('content-length') ?? 0);
        // Um PDF de verdade não tem 64 bytes. Arquivo minúsculo é quase sempre
        // resquício de seed, e dizer isso é mais útil do que deixar o navegador
        // mostrar "falha ao carregar" sem explicar por quê.
        if (bytes > 0 && bytes < 1024) {
          setAviso(`O arquivo tem apenas ${bytes} bytes — provavelmente é um marcador de teste, não o documento real.`);
        }
        setUrl(u);
      } catch (e) {
        if (vivo) setErro((e as Error).message);
      }
    })();
    return () => { vivo = false; };
  }, [doc.caminho]);

  const baixar = () => {
    if (!url) return showToast('Aguarde o documento carregar.');
    window.open(url, '_blank', 'noopener');
  };

  const ehPdf = doc.caminho.toLowerCase().endsWith('.pdf');

  return (
    <Modal open onClose={onClose} labelledBy="titulo-documento">
      <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-6 py-4">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="h-5 w-5 shrink-0 text-ink-400" />
          <span className="min-w-0">
            <span id="titulo-documento" className="block truncate text-[16px] font-semibold text-ink-900">{doc.titulo}</span>
            {doc.sub && <span className="block truncate text-[12px] text-ink-400">{doc.sub}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            onClick={baixar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-700 hover:bg-ink-50"
          >
            <Download className="h-4 w-4" />Baixar
          </button>
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100">
            <X className="h-5 w-5" />
          </button>
        </span>
      </div>

      {aviso && (
        <p className="border-b border-[#f6e0b0] bg-tag-softWarnBg px-6 py-2.5 text-[13px] text-tag-softWarnFg">{aviso}</p>
      )}

      <div className="flex min-h-[420px] items-center justify-center bg-ink-50 p-4">
        {!url && !erro && (
          <span className="flex items-center gap-2 text-sm text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" />Carregando documento…
          </span>
        )}
        {erro && (
          <span className="max-w-[360px] text-center text-sm text-ink-500">
            {erro}
            <span className="mt-1 block text-[13px] text-ink-400">Caminho: {doc.caminho}</span>
          </span>
        )}
        {url && ehPdf && (
          <iframe title={doc.titulo} src={url} className="h-[520px] w-full rounded-lg border border-ink-200 bg-white" />
        )}
        {/* Imagem e demais tipos não vão em iframe: o navegador baixaria em vez
            de exibir em alguns casos, e um <img> mostra direito o que é foto de
            mapeamento, que é o caso comum aqui. */}
        {url && !ehPdf && (
          <img src={url} alt={doc.titulo} className="max-h-[520px] max-w-full rounded-lg border border-ink-200 bg-white object-contain" />
        )}
      </div>
    </Modal>
  );
}
