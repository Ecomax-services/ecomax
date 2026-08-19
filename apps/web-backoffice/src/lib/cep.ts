/**
 * Consulta de CEP nos Correios, via ViaCEP.
 *
 * Serviço público e sem chave. Falha de rede não é motivo para travar o
 * cadastro — quem digita pode preencher o endereço à mão —, então o erro volta
 * como mensagem e a tela decide o que fazer.
 */
export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export const soDigitos = (v: string) => v.replace(/\D/g, '');

/** Oito dígitos, independentemente de como a pessoa digitou. */
export const cepCompleto = (v: string) => soDigitos(v).length === 8;

export async function buscarCep(cep: string): Promise<EnderecoCep> {
  const limpo = soDigitos(cep);
  if (limpo.length !== 8) throw new Error('O CEP precisa ter 8 dígitos.');

  let r: Response;
  try {
    r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
  } catch {
    throw new Error('Não foi possível consultar o CEP agora. Preencha o endereço à mão.');
  }
  if (!r.ok) throw new Error('Não foi possível consultar o CEP agora. Preencha o endereço à mão.');

  const d = await r.json();
  // O ViaCEP responde 200 com { erro: true } para CEP inexistente — checar só o
  // status deixaria passar e preencheria o formulário com campos vazios.
  if (d?.erro) throw new Error('CEP não encontrado.');

  return {
    logradouro: d.logradouro ?? '',
    bairro: d.bairro ?? '',
    cidade: d.localidade ?? '',
    uf: d.uf ?? '',
  };
}
