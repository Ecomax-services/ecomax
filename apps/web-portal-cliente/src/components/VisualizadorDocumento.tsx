/**
 * Visualizador de documento do Portal do Cliente.
 *
 * O protótipo abre **um modal** para todo documento — o mesmo leitor serve
 * Documentos, Produtos e Colaboradores —, com o título do arquivo, um botão
 * "Baixar" e um fechar. Era o único componente compartilhado entre as três
 * telas, e o que faltava aqui.
 *
 * Antes cada tela chamava `abrirDocumento`, que fazia `window.open` numa aba
 * nova. Dois problemas com isso:
 *
 *   1. Falhava em silêncio. Se a URL assinada não saísse, a função não fazia
 *      nada — o cliente clicava e a tela ficava igual, sem saber se o clique
 *      não pegou ou se o documento não existe.
 *   2. `createSignedUrl` assina caminho sem conferir se o objeto está lá.
 *      "Gerou URL" não é prova de nada: um registro apontando para arquivo
 *      ausente abria uma aba em branco com 404.
 *
 * Este componente é o mesmo do Backoffice (`components/VisualizadorDocumento`),
 * adaptado ao bucket do portal e ao visual do handoff — canto de 14px e chips
 * em pílula, que é o que o Portal usa.
 */
import { useEffect, useState } from 'react';
import { Download, X, FileText, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { urlAssinada } from '@/lib/portal';

/** Documento guardado como endereço externo, e não no nosso armazenamento. */
const EXTERNO = /^https?:\/\//;

export interface DocumentoParaVer {
  /** Caminho no bucket, ou URL externa (registro na ANVISA, por exemplo). */
  caminho: string;
  titulo: string;
  /** Linha de apoio — normalmente a categoria ou o nome do arquivo. */
  sub?: string;
}

export function VisualizadorDocumento({
  doc,
  onClose,
}: {
  doc: DocumentoParaVer;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setUrl(null);
    setErro(null);
    setAviso(null);

    (async () => {
      try {
        const u = await urlAssinada(doc.caminho);
        if (!vivo) return;
        if (!u) {
          setErro('Não foi possível gerar o endereço do arquivo.');
          return;
        }

        // Endereço externo (o registro na ANVISA, por exemplo) não passa pelo
        // nosso armazenamento e não tem como ser conferido: `fetch` de outra
        // origem sem CORS falha com "Failed to fetch" mesmo quando o documento
        // está lá. Nesses casos exibimos direto — o navegador é quem reporta se
        // o endereço não responder.
        if (EXTERNO.test(doc.caminho)) {
          setUrl(u);
          return;
        }

        // Quem responde de verdade é o storage. Sem esta chamada, um registro
        // apontando para arquivo inexistente virava um quadro branco.
        const r = await fetch(u);
        if (!vivo) return;
        if (!r.ok) {
          setErro(
            r.status === 404
              ? 'O arquivo não está no armazenamento, embora o registro exista no sistema.'
              : `O armazenamento respondeu ${r.status} ao buscar o arquivo.`,
          );
          return;
        }

        const bytes = Number(r.headers.get('content-length') ?? 0);
        // Um PDF de verdade não tem 64 bytes. Arquivo minúsculo é quase sempre
        // resquício de carga de teste, e dizer isso é mais útil do que deixar o
        // navegador mostrar "falha ao carregar" sem explicar por quê.
        if (bytes > 0 && bytes < 1024) {
          setAviso(
            `O arquivo tem apenas ${bytes} bytes — provavelmente é um marcador de teste, não o documento real.`,
          );
        }
        setUrl(u);
      } catch (e) {
        // A mensagem crua do navegador ("Failed to fetch", "NetworkError")
        // não diz nada a quem está do outro lado da tela.
        if (vivo) {
          console.error('falha ao abrir documento', doc.caminho, e);
          setErro('Não foi possível carregar o documento. Verifique sua conexão e tente de novo.');
        }
      }
    })();

    return () => {
      vivo = false;
    };
  }, [doc.caminho]);

  const baixar = () => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const ehPdf = doc.caminho.toLowerCase().split('?')[0].endsWith('.pdf');

  return (
    <Modal open onClose={onClose} labelledBy="titulo-documento" largura="largo">
      <div className="flex items-center justify-between gap-4 border-b border-ink-200 px-6 py-4">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="h-5 w-5 shrink-0 text-ink-400" />
          <span className="min-w-0">
            <span
              id="titulo-documento"
              className="block truncate text-[16px] font-semibold text-ink-900"
            >
              {doc.titulo}
            </span>
            {doc.sub && <span className="block truncate text-[12px] text-ink-400">{doc.sub}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            onClick={baixar}
            disabled={!url}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Baixar
          </button>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100"
          >
            <X className="h-5 w-5" />
          </button>
        </span>
      </div>

      {aviso && (
        <p className="border-b border-[#f6e0b0] bg-warnTag-bg px-6 py-2.5 text-[13px] text-warnTag-fg">
          {aviso}
        </p>
      )}

      <div className="flex min-h-[420px] items-center justify-center bg-ink-50 p-4">
        {!url && !erro && (
          <span className="flex items-center gap-2 text-sm text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando documento…
          </span>
        )}
        {erro && (
          <span className="max-w-[420px] text-center text-sm text-ink-500">
            {erro}
            <span className="mt-2 block text-[13px] text-ink-400">
              Se o problema continuar, fale com a Ecomax informando o nome do documento.
            </span>
          </span>
        )}
        {url && ehPdf && (
          <iframe
            title={doc.titulo}
            src={url}
            className="h-[62vh] w-full rounded-xl border border-ink-200 bg-white"
          />
        )}
        {/* Imagem não vai em iframe: em alguns navegadores o arquivo seria
            baixado em vez de exibido, e um <img> mostra direito o que é foto. */}
        {url && !ehPdf && (
          <img
            src={url}
            alt={doc.titulo}
            className="max-h-[62vh] max-w-full rounded-xl border border-ink-200 bg-white object-contain"
          />
        )}
      </div>
    </Modal>
  );
}
