// GERADO AUTOMATICAMENTE — não edite à mão.
//
// Origem: `supabase gen types typescript` sobre o schema public do projeto.
// Para atualizar depois de qualquer migration:  ./scripts/gen-types.sh
//
// As três cópias em apps/*/src/lib/database.types.ts são deste arquivo. A
// duplicação existe porque ainda não há workspace na raiz — cada app tem seu
// próprio package.json, e Vite e Metro resolvem fora do root de formas
// diferentes. O job de tipos da CI falha se as cópias divergirem, e tudo isso
// colapsa num pacote compartilhado quando packages/core existir.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string
          actor_id: string | null
          created_at: string
          detalhes: Json | null
          funcionario_id: string | null
          id: string
          justificativa: string | null
          modulo: Database["public"]["Enums"]["module_key"]
        }
        Insert: {
          acao: string
          actor_id?: string | null
          created_at?: string
          detalhes?: Json | null
          funcionario_id?: string | null
          id?: string
          justificativa?: string | null
          modulo?: Database["public"]["Enums"]["module_key"]
        }
        Update: {
          acao?: string
          actor_id?: string | null
          created_at?: string
          detalhes?: Json | null
          funcionario_id?: string | null
          id?: string
          justificativa?: string | null
          modulo?: Database["public"]["Enums"]["module_key"]
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      bases: {
        Row: {
          ativo: boolean
          bairro: string | null
          central: boolean
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          responsavel_id: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          central?: boolean
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          responsavel_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          central?: boolean
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          responsavel_id?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bases_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_itens: {
        Row: {
          ativo: boolean
          catalogo: string
          cor_bg: string | null
          cor_fg: string | null
          created_at: string
          created_by: string | null
          garantia_meses: number | null
          id: string
          nome: string
          observacao: string | null
          ordem: number
          prazo_padrao: number | null
          template_mensagem: string | null
          updated_at: string
          valor: string | null
        }
        Insert: {
          ativo?: boolean
          catalogo: string
          cor_bg?: string | null
          cor_fg?: string | null
          created_at?: string
          created_by?: string | null
          garantia_meses?: number | null
          id?: string
          nome: string
          observacao?: string | null
          ordem?: number
          prazo_padrao?: number | null
          template_mensagem?: string | null
          updated_at?: string
          valor?: string | null
        }
        Update: {
          ativo?: boolean
          catalogo?: string
          cor_bg?: string | null
          cor_fg?: string | null
          created_at?: string
          created_by?: string | null
          garantia_meses?: number | null
          id?: string
          nome?: string
          observacao?: string | null
          ordem?: number
          prazo_padrao?: number | null
          template_mensagem?: string | null
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      cliente_contatos: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          email: string | null
          id: string
          nome: string | null
          padrao: boolean
          recebe_email: boolean
          rel_tecnica: boolean
          telefone: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          padrao?: boolean
          recebe_email?: boolean
          rel_tecnica?: boolean
          telefone?: string | null
          tipo: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          padrao?: boolean
          recebe_email?: boolean
          rel_tecnica?: boolean
          telefone?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_documentos: {
        Row: {
          arquivo_url: string | null
          ativo: boolean
          categoria: string
          cliente_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          titulo: string
          updated_at: string
          validade: string | null
        }
        Insert: {
          arquivo_url?: string | null
          ativo?: boolean
          categoria: string
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          titulo: string
          updated_at?: string
          validade?: string | null
        }
        Update: {
          arquivo_url?: string | null
          ativo?: boolean
          categoria?: string
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          titulo?: string
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_funcionarios: {
        Row: {
          cliente_id: string
          created_at: string
          funcionario_id: string
          id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          funcionario_id: string
          id?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          funcionario_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_funcionarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_portal_usuarios: {
        Row: {
          cliente_id: string
          created_at: string
          email: string
          id: string
          nome: string
          perfil: string | null
          status: string
          ultimo_acesso: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          email: string
          id?: string
          nome: string
          perfil?: string | null
          status?: string
          ultimo_acesso?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          perfil?: string | null
          status?: string
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_portal_usuarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_produtos_homologados: {
        Row: {
          cliente_id: string
          created_at: string
          data_homologacao: string
          id: string
          produto_id: string
          validade: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_homologacao?: string
          id?: string
          produto_id: string
          validade?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_homologacao?: string
          id?: string
          produto_id?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_produtos_homologados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_produtos_homologados_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_produtos_homologados_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          classificacao_abc: string | null
          cnpj: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          razao_social: string | null
          regiao: string | null
          telefone: string | null
          tipo_pessoa: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          classificacao_abc?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          regiao?: string | null
          telefone?: string | null
          tipo_pessoa?: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          classificacao_abc?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          regiao?: string | null
          telefone?: string | null
          tipo_pessoa?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comercial_follow_ups: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          data_acao: string
          data_registro: string
          descricao: string | null
          id: string
          orcamento_id: string | null
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          data_acao: string
          data_registro?: string
          descricao?: string | null
          id?: string
          orcamento_id?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          data_acao?: string
          data_registro?: string
          descricao?: string | null
          id?: string
          orcamento_id?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comercial_follow_ups_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercial_follow_ups_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercial_follow_ups_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comercial_fup_anexos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          follow_up_id: string
          id: string
          nome: string
          tamanho_bytes: number | null
          tipo: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_id: string
          id?: string
          nome: string
          tamanho_bytes?: number | null
          tipo?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_id?: string
          id?: string
          nome?: string
          tamanho_bytes?: number | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comercial_fup_anexos_follow_up_id_fkey"
            columns: ["follow_up_id"]
            isOneToOne: false
            referencedRelation: "comercial_follow_ups"
            referencedColumns: ["id"]
          },
        ]
      }
      comercial_garantia_anexos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          garantia_id: string
          id: string
          nome: string
          tamanho_bytes: number | null
          tipo: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          garantia_id: string
          id?: string
          nome: string
          tamanho_bytes?: number | null
          tipo?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          garantia_id?: string
          id?: string
          nome?: string
          tamanho_bytes?: number | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comercial_garantia_anexos_garantia_id_fkey"
            columns: ["garantia_id"]
            isOneToOne: false
            referencedRelation: "comercial_garantias"
            referencedColumns: ["id"]
          },
        ]
      }
      comercial_garantia_historico: {
        Row: {
          actor_id: string | null
          campo: string
          comentario: string | null
          created_at: string
          garantia_id: string
          id: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          actor_id?: string | null
          campo: string
          comentario?: string | null
          created_at?: string
          garantia_id: string
          id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          actor_id?: string | null
          campo?: string
          comentario?: string | null
          created_at?: string
          garantia_id?: string
          id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comercial_garantia_historico_garantia_id_fkey"
            columns: ["garantia_id"]
            isOneToOne: false
            referencedRelation: "comercial_garantias"
            referencedColumns: ["id"]
          },
        ]
      }
      comercial_garantia_links: {
        Row: {
          aberto_em: string | null
          created_at: string
          created_by: string | null
          expira_em: string
          garantia_id: string
          id: string
          respondido_em: string | null
          resposta: string | null
          revogado: boolean
          token: string
        }
        Insert: {
          aberto_em?: string | null
          created_at?: string
          created_by?: string | null
          expira_em: string
          garantia_id: string
          id?: string
          respondido_em?: string | null
          resposta?: string | null
          revogado?: boolean
          token: string
        }
        Update: {
          aberto_em?: string | null
          created_at?: string
          created_by?: string | null
          expira_em?: string
          garantia_id?: string
          id?: string
          respondido_em?: string | null
          resposta?: string | null
          revogado?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "comercial_garantia_links_garantia_id_fkey"
            columns: ["garantia_id"]
            isOneToOne: false
            referencedRelation: "comercial_garantias"
            referencedColumns: ["id"]
          },
        ]
      }
      comercial_garantia_servicos: {
        Row: {
          created_at: string
          garantia_id: string
          id: string
          observacao: string | null
          tipo_servico: string
        }
        Insert: {
          created_at?: string
          garantia_id: string
          id?: string
          observacao?: string | null
          tipo_servico: string
        }
        Update: {
          created_at?: string
          garantia_id?: string
          id?: string
          observacao?: string | null
          tipo_servico?: string
        }
        Relationships: [
          {
            foreignKeyName: "comercial_garantia_servicos_garantia_id_fkey"
            columns: ["garantia_id"]
            isOneToOne: false
            referencedRelation: "comercial_garantias"
            referencedColumns: ["id"]
          },
        ]
      }
      comercial_garantias: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          data_contato_renovacao: string | null
          data_execucao: string | null
          data_validade: string
          id: string
          observacao: string | null
          os_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          data_contato_renovacao?: string | null
          data_execucao?: string | null
          data_validade: string
          id?: string
          observacao?: string | null
          os_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          data_contato_renovacao?: string | null
          data_execucao?: string | null
          data_validade?: string
          id?: string
          observacao?: string | null
          os_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comercial_garantias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comercial_garantias_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: true
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_respostas: {
        Row: {
          condicao: string | null
          cotacao_id: string
          fornecedor_id: string | null
          id: string
          melhor: boolean
          prazo: string | null
          valor: number | null
        }
        Insert: {
          condicao?: string | null
          cotacao_id: string
          fornecedor_id?: string | null
          id?: string
          melhor?: boolean
          prazo?: string | null
          valor?: number | null
        }
        Update: {
          condicao?: string | null
          cotacao_id?: string
          fornecedor_id?: string | null
          id?: string
          melhor?: boolean
          prazo?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_respostas_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_respostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_respostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          codigo: string
          created_at: string
          id: string
          produto_id: string | null
          quantidade: string | null
          status: Database["public"]["Enums"]["cotacao_status"]
          updated_at: string
        }
        Insert: {
          codigo?: string
          created_at?: string
          id?: string
          produto_id?: string | null
          quantidade?: string | null
          status?: Database["public"]["Enums"]["cotacao_status"]
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          produto_id?: string | null
          quantidade?: string | null
          status?: Database["public"]["Enums"]["cotacao_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_lotes: {
        Row: {
          base_id: string
          created_at: string
          id: string
          lote: string
          produto_id: string
          quantidade: number
          updated_at: string
          validade: string | null
        }
        Insert: {
          base_id: string
          created_at?: string
          id?: string
          lote: string
          produto_id: string
          quantidade?: number
          updated_at?: string
          validade?: string | null
        }
        Update: {
          base_id?: string
          created_at?: string
          id?: string
          lote?: string
          produto_id?: string
          quantidade?: number
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_lotes_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_lotes_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "vw_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_lotes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_lotes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_niveis: {
        Row: {
          base_id: string
          created_at: string
          estoque_max: number | null
          estoque_min: number
          id: string
          produto_id: string
          updated_at: string
        }
        Insert: {
          base_id: string
          created_at?: string
          estoque_max?: number | null
          estoque_min?: number
          id?: string
          produto_id: string
          updated_at?: string
        }
        Update: {
          base_id?: string
          created_at?: string
          estoque_max?: number | null
          estoque_min?: number
          id?: string
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_niveis_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_niveis_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "vw_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_niveis_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_niveis_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      filtros_salvos: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          favorito: boolean
          id: string
          modulo: string
          nome: string
          regras: Json
          updated_at: string
          visibilidade: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          favorito?: boolean
          id?: string
          modulo: string
          nome: string
          regras?: Json
          updated_at?: string
          visibilidade?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          favorito?: boolean
          id?: string
          modulo?: string
          nome?: string
          regras?: Json
          updated_at?: string
          visibilidade?: string
        }
        Relationships: []
      }
      fornecedor_contatos: {
        Row: {
          cargo: string | null
          created_at: string
          email: string | null
          fornecedor_id: string
          id: string
          nome: string
          principal: boolean
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          fornecedor_id: string
          id?: string
          nome: string
          principal?: boolean
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          fornecedor_id?: string
          id?: string
          nome?: string
          principal?: boolean
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_contatos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_contatos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_produtos: {
        Row: {
          created_at: string
          fornecedor_id: string
          id: string
          produto_id: string
        }
        Insert: {
          created_at?: string
          fornecedor_id: string
          id?: string
          produto_id: string
        }
        Update: {
          created_at?: string
          fornecedor_id?: string
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          avaliacao: number
          categoria: string | null
          cnpj: string | null
          created_at: string
          dados_bancarios: Json | null
          email: string | null
          id: string
          razao_social: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avaliacao?: number
          categoria?: string | null
          cnpj?: string | null
          created_at?: string
          dados_bancarios?: Json | null
          email?: string | null
          id?: string
          razao_social: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avaliacao?: number
          categoria?: string | null
          cnpj?: string | null
          created_at?: string
          dados_bancarios?: Json | null
          email?: string | null
          id?: string
          razao_social?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      funcionario_documentos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          funcionario_id: string
          id: string
          observacao: string | null
          tipo: string
          updated_at: string
          validade: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          funcionario_id: string
          id?: string
          observacao?: string | null
          tipo: string
          updated_at?: string
          validade?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          funcionario_id?: string
          id?: string
          observacao?: string | null
          tipo?: string
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          aso_arquivo_url: string | null
          aso_validade: string | null
          ativo: boolean
          avatar_url: string | null
          bairro: string | null
          carga_horaria: string | null
          cargo: string
          cep: string | null
          cidade: string | null
          cnh_arquivo_url: string | null
          cnh_categoria: string | null
          cnh_numero: string | null
          cnh_validade: string | null
          complemento: string | null
          cpf: string
          created_at: string
          created_by: string | null
          data_admissao: string | null
          data_nascimento: string | null
          email: string | null
          gestor_id: string | null
          id: string
          logradouro: string | null
          nome_completo: string
          numero: string | null
          observacoes: string | null
          profile_id: string | null
          rg: string | null
          setor: string
          telefone: string | null
          turno: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          aso_arquivo_url?: string | null
          aso_validade?: string | null
          ativo?: boolean
          avatar_url?: string | null
          bairro?: string | null
          carga_horaria?: string | null
          cargo: string
          cep?: string | null
          cidade?: string | null
          cnh_arquivo_url?: string | null
          cnh_categoria?: string | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          complemento?: string | null
          cpf: string
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          gestor_id?: string | null
          id?: string
          logradouro?: string | null
          nome_completo: string
          numero?: string | null
          observacoes?: string | null
          profile_id?: string | null
          rg?: string | null
          setor: string
          telefone?: string | null
          turno?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          aso_arquivo_url?: string | null
          aso_validade?: string | null
          ativo?: boolean
          avatar_url?: string | null
          bairro?: string | null
          carga_horaria?: string | null
          cargo?: string
          cep?: string | null
          cidade?: string | null
          cnh_arquivo_url?: string | null
          cnh_categoria?: string | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          complemento?: string | null
          cpf?: string
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          gestor_id?: string | null
          id?: string
          logradouro?: string | null
          nome_completo?: string
          numero?: string | null
          observacoes?: string | null
          profile_id?: string | null
          rg?: string | null
          setor?: string
          telefone?: string | null
          turno?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_itens: {
        Row: {
          id: string
          inventario_id: string
          lote: string
          lote_id: string | null
          produto_id: string
          qtd_contada: number | null
          qtd_sistema: number
        }
        Insert: {
          id?: string
          inventario_id: string
          lote: string
          lote_id?: string | null
          produto_id: string
          qtd_contada?: number | null
          qtd_sistema?: number
        }
        Update: {
          id?: string
          inventario_id?: string
          lote?: string
          lote_id?: string | null
          produto_id?: string
          qtd_contada?: number | null
          qtd_sistema?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventario_itens_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_itens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "estoque_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      inventarios: {
        Row: {
          base_id: string
          closed_at: string | null
          codigo: string
          created_at: string
          created_by: string | null
          id: string
          status: Database["public"]["Enums"]["inventario_status"]
        }
        Insert: {
          base_id: string
          closed_at?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["inventario_status"]
        }
        Update: {
          base_id?: string
          closed_at?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["inventario_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inventarios_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventarios_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "vw_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          ator_id: string | null
          base_destino_id: string | null
          base_origem_id: string | null
          created_at: string
          descricao: string | null
          id: string
          lote: string | null
          produto_id: string | null
          quantidade: number
          tipo: Database["public"]["Enums"]["mov_tipo"]
        }
        Insert: {
          ator_id?: string | null
          base_destino_id?: string | null
          base_origem_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lote?: string | null
          produto_id?: string | null
          quantidade: number
          tipo: Database["public"]["Enums"]["mov_tipo"]
        }
        Update: {
          ator_id?: string | null
          base_destino_id?: string | null
          base_origem_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lote?: string | null
          produto_id?: string | null
          quantidade?: number
          tipo?: Database["public"]["Enums"]["mov_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_base_destino_id_fkey"
            columns: ["base_destino_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_base_destino_id_fkey"
            columns: ["base_destino_id"]
            isOneToOne: false
            referencedRelation: "vw_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_base_origem_id_fkey"
            columns: ["base_origem_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_base_origem_id_fkey"
            columns: ["base_origem_id"]
            isOneToOne: false
            referencedRelation: "vw_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          lida: boolean
          link: string | null
          os_id: string | null
          para_cliente_id: string | null
          para_profile_id: string | null
          para_role: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          os_id?: string | null
          para_cliente_id?: string | null
          para_profile_id?: string | null
          para_role?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          os_id?: string | null
          para_cliente_id?: string | null
          para_profile_id?: string | null
          para_role?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_para_cliente_id_fkey"
            columns: ["para_cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          created_at: string
          frequencia: string
          id: string
          orcamento_id: string
          tipo_controle: string
          valor: number
        }
        Insert: {
          created_at?: string
          frequencia: string
          id?: string
          orcamento_id: string
          tipo_controle: string
          valor?: number
        }
        Update: {
          created_at?: string
          frequencia?: string
          id?: string
          orcamento_id?: string
          tipo_controle?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          created_by: string | null
          data: string
          gestor_id: string | null
          id: string
          observacao: string | null
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          cliente_id: string
          codigo?: string
          created_at?: string
          created_by?: string | null
          data?: string
          gestor_id?: string | null
          id?: string
          observacao?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          created_by?: string | null
          data?: string
          gestor_id?: string | null
          id?: string
          observacao?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          assinatura_url: string | null
          cancelamento_motivo: string | null
          check_in_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_at: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          cliente_id: string
          codigo: string
          contato: string | null
          created_at: string
          created_by: string | null
          data_programada: string | null
          data_validade: string | null
          descricao: string | null
          duracao_estimada: string | null
          email_enviado: boolean
          email_enviado_em: string | null
          endereco_execucao: string | null
          epis: string[]
          etapa: string | null
          funcionario_integrado_id: string | null
          hora_comprometida: string | null
          hora_prevista: string | null
          id: string
          inicio_execucao: string | null
          mapa_pontos_url: string | null
          necessita_relatorio: boolean
          observacoes: string | null
          orcamento_id: string | null
          outros_documentos: string | null
          pragas: string[]
          rascunho: boolean
          recorrencia: string
          responsavel_admin_id: string | null
          status: string
          termino_execucao: string | null
          tipos_servico: string[]
          updated_at: string
        }
        Insert: {
          assinatura_url?: string | null
          cancelamento_motivo?: string | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          cliente_id: string
          codigo?: string
          contato?: string | null
          created_at?: string
          created_by?: string | null
          data_programada?: string | null
          data_validade?: string | null
          descricao?: string | null
          duracao_estimada?: string | null
          email_enviado?: boolean
          email_enviado_em?: string | null
          endereco_execucao?: string | null
          epis?: string[]
          etapa?: string | null
          funcionario_integrado_id?: string | null
          hora_comprometida?: string | null
          hora_prevista?: string | null
          id?: string
          inicio_execucao?: string | null
          mapa_pontos_url?: string | null
          necessita_relatorio?: boolean
          observacoes?: string | null
          orcamento_id?: string | null
          outros_documentos?: string | null
          pragas?: string[]
          rascunho?: boolean
          recorrencia?: string
          responsavel_admin_id?: string | null
          status?: string
          termino_execucao?: string | null
          tipos_servico?: string[]
          updated_at?: string
        }
        Update: {
          assinatura_url?: string | null
          cancelamento_motivo?: string | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          cliente_id?: string
          codigo?: string
          contato?: string | null
          created_at?: string
          created_by?: string | null
          data_programada?: string | null
          data_validade?: string | null
          descricao?: string | null
          duracao_estimada?: string | null
          email_enviado?: boolean
          email_enviado_em?: string | null
          endereco_execucao?: string | null
          epis?: string[]
          etapa?: string | null
          funcionario_integrado_id?: string | null
          hora_comprometida?: string | null
          hora_prevista?: string | null
          id?: string
          inicio_execucao?: string | null
          mapa_pontos_url?: string | null
          necessita_relatorio?: boolean
          observacoes?: string | null
          orcamento_id?: string | null
          outros_documentos?: string | null
          pragas?: string[]
          rascunho?: boolean
          recorrencia?: string
          responsavel_admin_id?: string | null
          status?: string
          termino_execucao?: string | null
          tipos_servico?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_funcionario_integrado_id_fkey"
            columns: ["funcionario_integrado_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_responsavel_admin_id_fkey"
            columns: ["responsavel_admin_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      os_anexos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          os_id: string
          tipo: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          os_id: string
          tipo?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          os_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_anexos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_cronograma: {
        Row: {
          created_at: string
          data_prevista: string
          id: string
          ordem: number
          os_id: string
          status: string
        }
        Insert: {
          created_at?: string
          data_prevista: string
          id?: string
          ordem?: number
          os_id: string
          status?: string
        }
        Update: {
          created_at?: string
          data_prevista?: string
          id?: string
          ordem?: number
          os_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_cronograma_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_equipamentos: {
        Row: {
          created_at: string
          id: string
          numero_serie: string | null
          os_id: string
          produto_id: string
          responsavel_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          numero_serie?: string | null
          os_id: string
          produto_id: string
          responsavel_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          numero_serie?: string | null
          os_id?: string
          produto_id?: string
          responsavel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_equipamentos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_equipamentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_equipamentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_equipamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      os_funcionarios: {
        Row: {
          created_at: string
          funcionario_id: string
          id: string
          os_id: string
        }
        Insert: {
          created_at?: string
          funcionario_id: string
          id?: string
          os_id: string
        }
        Update: {
          created_at?: string
          funcionario_id?: string
          id?: string
          os_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_funcionarios_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_historico: {
        Row: {
          actor_id: string | null
          campo: string
          created_at: string
          id: string
          os_id: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          actor_id?: string | null
          campo: string
          created_at?: string
          id?: string
          os_id: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          actor_id?: string | null
          campo?: string
          created_at?: string
          id?: string
          os_id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_historico_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_plano_pontos: {
        Row: {
          id: string
          identificacao: string | null
          numero: number
          observacao: string | null
          plano_id: string
          preenchido_em: string | null
          preenchido_por: string | null
          situacao: string
        }
        Insert: {
          id?: string
          identificacao?: string | null
          numero: number
          observacao?: string | null
          plano_id: string
          preenchido_em?: string | null
          preenchido_por?: string | null
          situacao?: string
        }
        Update: {
          id?: string
          identificacao?: string | null
          numero?: number
          observacao?: string | null
          plano_id?: string
          preenchido_em?: string | null
          preenchido_por?: string | null
          situacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_plano_pontos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "os_planos_controle"
            referencedColumns: ["id"]
          },
        ]
      }
      os_planos_controle: {
        Row: {
          created_at: string
          frequencia: string | null
          id: string
          os_id: string
          pontos_previstos: number
          tipo_controle: string
        }
        Insert: {
          created_at?: string
          frequencia?: string | null
          id?: string
          os_id: string
          pontos_previstos?: number
          tipo_controle: string
        }
        Update: {
          created_at?: string
          frequencia?: string | null
          id?: string
          os_id?: string
          pontos_previstos?: number
          tipo_controle?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_planos_controle_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_produtos: {
        Row: {
          base_id: string | null
          created_at: string
          id: string
          lote: string | null
          observacao: string | null
          os_id: string
          prazo_alvo: string | null
          produto_id: string
          qtd_recomendada: number
          qtd_utilizada: number | null
          unidade: string | null
        }
        Insert: {
          base_id?: string | null
          created_at?: string
          id?: string
          lote?: string | null
          observacao?: string | null
          os_id: string
          prazo_alvo?: string | null
          produto_id: string
          qtd_recomendada?: number
          qtd_utilizada?: number | null
          unidade?: string | null
        }
        Update: {
          base_id?: string | null
          created_at?: string
          id?: string
          lote?: string | null
          observacao?: string | null
          os_id?: string
          prazo_alvo?: string | null
          produto_id?: string
          qtd_recomendada?: number
          qtd_utilizada?: number | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_produtos_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_produtos_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "vw_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_produtos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      os_relatorios: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          id: string
          os_id: string
          publicado: boolean
          publicado_at: string | null
          titulo: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          os_id: string
          publicado?: boolean
          publicado_at?: string | null
          titulo: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          os_id?: string
          publicado?: boolean
          publicado_at?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_relatorios_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_acesso: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      permissoes_modulo: {
        Row: {
          id: string
          modulo: Database["public"]["Enums"]["module_key"]
          perfil_acesso_id: string
          pode_criar: boolean
          pode_editar: boolean
          pode_excluir: boolean
          pode_ler: boolean
        }
        Insert: {
          id?: string
          modulo: Database["public"]["Enums"]["module_key"]
          perfil_acesso_id: string
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_ler?: boolean
        }
        Update: {
          id?: string
          modulo?: Database["public"]["Enums"]["module_key"]
          perfil_acesso_id?: string
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_ler?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_modulo_perfil_acesso_id_fkey"
            columns: ["perfil_acesso_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          anvisa_url: string | null
          ativo: boolean
          categoria: string
          codigo: string
          created_at: string
          estoque_max: number | null
          estoque_min: number
          fds_url: string | null
          ficha_emergencia_url: string | null
          ficha_tecnica_url: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          observacao: string | null
          registro_anvisa: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          anvisa_url?: string | null
          ativo?: boolean
          categoria: string
          codigo: string
          created_at?: string
          estoque_max?: number | null
          estoque_min?: number
          fds_url?: string | null
          ficha_emergencia_url?: string | null
          ficha_tecnica_url?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          observacao?: string | null
          registro_anvisa?: string | null
          unidade: string
          updated_at?: string
        }
        Update: {
          anvisa_url?: string | null
          ativo?: boolean
          categoria?: string
          codigo?: string
          created_at?: string
          estoque_max?: number | null
          estoque_min?: number
          fds_url?: string | null
          ficha_emergencia_url?: string | null
          ficha_tecnica_url?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          registro_anvisa?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cliente_id: string | null
          created_at: string
          created_by: string | null
          id: string
          nome_completo: string
          perfil_acesso_id: string | null
          preferencias: Json | null
          role: Database["public"]["Enums"]["user_role"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          id: string
          nome_completo: string
          perfil_acesso_id?: string | null
          preferencias?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome_completo?: string
          perfil_acesso_id?: string | null
          preferencias?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_perfil_acesso_id_fkey"
            columns: ["perfil_acesso_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicoes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          aprovador_id: string | null
          codigo: string
          created_at: string
          fornecedor_id: string | null
          id: string
          nota_fiscal_url: string | null
          produto_id: string | null
          quantidade: string | null
          solicitante_id: string | null
          status: Database["public"]["Enums"]["req_status"]
          updated_at: string
          valor: number | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          aprovador_id?: string | null
          codigo?: string
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal_url?: string | null
          produto_id?: string | null
          quantidade?: string | null
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["req_status"]
          updated_at?: string
          valor?: number | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          aprovador_id?: string | null
          codigo?: string
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal_url?: string | null
          produto_id?: string | null
          quantidade?: string | null
          solicitante_id?: string | null
          status?: Database["public"]["Enums"]["req_status"]
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias: {
        Row: {
          ator_envio_id: string | null
          ator_recebimento_id: string | null
          base_destino_id: string
          base_origem_id: string
          codigo: string
          created_at: string
          id: string
          justificativa_divergencia: string | null
          lote: string
          motivo: string | null
          produto_id: string
          quantidade_enviada: number
          quantidade_recebida: number | null
          recebida_at: string | null
          status: Database["public"]["Enums"]["transferencia_status"]
          validade: string | null
        }
        Insert: {
          ator_envio_id?: string | null
          ator_recebimento_id?: string | null
          base_destino_id: string
          base_origem_id: string
          codigo?: string
          created_at?: string
          id?: string
          justificativa_divergencia?: string | null
          lote: string
          motivo?: string | null
          produto_id: string
          quantidade_enviada: number
          quantidade_recebida?: number | null
          recebida_at?: string | null
          status?: Database["public"]["Enums"]["transferencia_status"]
          validade?: string | null
        }
        Update: {
          ator_envio_id?: string | null
          ator_recebimento_id?: string | null
          base_destino_id?: string
          base_origem_id?: string
          codigo?: string
          created_at?: string
          id?: string
          justificativa_divergencia?: string | null
          lote?: string
          motivo?: string | null
          produto_id?: string
          quantidade_enviada?: number
          quantidade_recebida?: number | null
          recebida_at?: string | null
          status?: Database["public"]["Enums"]["transferencia_status"]
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_base_destino_id_fkey"
            columns: ["base_destino_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_base_destino_id_fkey"
            columns: ["base_destino_id"]
            isOneToOne: false
            referencedRelation: "vw_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_base_origem_id_fkey"
            columns: ["base_origem_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_base_origem_id_fkey"
            columns: ["base_origem_id"]
            isOneToOne: false
            referencedRelation: "vw_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_bases: {
        Row: {
          ativo: boolean | null
          central: boolean | null
          cidade: string | null
          created_at: string | null
          id: string | null
          itens_total: number | null
          nome: string | null
          num_produtos: number | null
          responsavel_id: string | null
          responsavel_nome: string | null
          uf: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bases_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_fornecedores: {
        Row: {
          ativo: boolean | null
          avaliacao: number | null
          avaliacao_calc: number | null
          categoria: string | null
          cnpj: string | null
          compras_total: number | null
          created_at: string | null
          dados_bancarios: Json | null
          email: string | null
          id: string | null
          num_compras: number | null
          num_cotacoes_ganhas: number | null
          num_produtos: number | null
          razao_social: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          avaliacao?: number | null
          avaliacao_calc?: never
          categoria?: string | null
          cnpj?: string | null
          compras_total?: never
          created_at?: string | null
          dados_bancarios?: Json | null
          email?: string | null
          id?: string | null
          num_compras?: never
          num_cotacoes_ganhas?: never
          num_produtos?: never
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          avaliacao?: number | null
          avaliacao_calc?: never
          categoria?: string | null
          cnpj?: string | null
          compras_total?: never
          created_at?: string | null
          dados_bancarios?: Json | null
          email?: string | null
          id?: string | null
          num_compras?: never
          num_cotacoes_ganhas?: never
          num_produtos?: never
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vw_produtos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string | null
          created_at: string | null
          estoque_max: number | null
          estoque_min: number | null
          estoque_total: number | null
          fornecedor_id: string | null
          fornecedor_razao: string | null
          id: string | null
          nome: string | null
          observacao: string | null
          unidade: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acesso_status: {
        Args: { _profile_id: string }
        Returns: {
          bloqueado: boolean
          ultimo_login: string
        }[]
      }
      apps_for_role: {
        Args: { r: Database["public"]["Enums"]["user_role"] }
        Returns: Database["public"]["Enums"]["app_key"][]
      }
      baixar_estoque_os: { Args: { p_os_id: string }; Returns: number }
      catalogo_uso: {
        Args: { _catalogo: string }
        Returns: {
          nome: string
          uso: number
        }[]
      }
      catalogo_uso_interno: {
        Args: { _catalogo: string }
        Returns: {
          nome: string
          uso: number
        }[]
      }
      cliente_in_my_os: { Args: { _cliente_id: string }; Returns: boolean }
      comercial_doc_escopo: { Args: { _name: string }; Returns: string }
      contar_pontos_preenchidos: {
        Args: { _plano_id: string }
        Returns: number
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      funcionario_in_my_os: {
        Args: { _funcionario_id: string }
        Returns: boolean
      }
      garantias_marcar_a_renovar: { Args: never; Returns: number }
      has_app_access: {
        Args: { app: Database["public"]["Enums"]["app_key"] }
        Returns: boolean
      }
      has_module_perm: {
        Args: {
          _acao: string
          _modulo: Database["public"]["Enums"]["module_key"]
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      my_portal_cliente_ids: { Args: never; Returns: string[] }
      os_is_mine: { Args: { _os_id: string }; Returns: boolean }
      os_is_my_cliente: { Args: { _os_id: string }; Returns: boolean }
      os_relatorio_publicado: { Args: { _os_id: string }; Returns: boolean }
      portal_doc_escopo: { Args: { _name: string }; Returns: string }
      portal_doc_id: { Args: { _name: string }; Returns: string }
      produto_do_meu_cliente: {
        Args: { _produto_id: string }
        Returns: boolean
      }
      produto_in_my_os: { Args: { _produto_id: string }; Returns: boolean }
      storage_os_id: { Args: { _name: string }; Returns: string }
      storage_os_tipo: { Args: { _name: string }; Returns: string }
    }
    Enums: {
      app_key: "backoffice" | "portal_cliente" | "mobile_operador"
      cotacao_status: "aguardando" | "respondida" | "aprovada" | "cancelada"
      inventario_status: "aberto" | "fechado" | "cancelado"
      module_key:
        | "dashboard"
        | "gestao_clientes"
        | "operacional"
        | "comercial"
        | "estoque"
        | "relatorios"
        | "financeiro"
        | "gestao_usuarios"
        | "configuracoes"
        | "notificacoes"
      mov_tipo: "entrada" | "saida" | "transferencia" | "ajuste"
      req_status:
        | "aguardando_aprovacao"
        | "aprovada"
        | "enviada"
        | "recebida"
        | "recusada"
        | "cancelada"
      transferencia_status: "em_transito" | "recebida" | "cancelada"
      user_role:
        | "admin"
        | "gestor"
        | "operacional"
        | "comercial"
        | "financeiro"
        | "rh"
        | "almoxarifado"
        | "operador"
        | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_key: ["backoffice", "portal_cliente", "mobile_operador"],
      cotacao_status: ["aguardando", "respondida", "aprovada", "cancelada"],
      inventario_status: ["aberto", "fechado", "cancelado"],
      module_key: [
        "dashboard",
        "gestao_clientes",
        "operacional",
        "comercial",
        "estoque",
        "relatorios",
        "financeiro",
        "gestao_usuarios",
        "configuracoes",
        "notificacoes",
      ],
      mov_tipo: ["entrada", "saida", "transferencia", "ajuste"],
      req_status: [
        "aguardando_aprovacao",
        "aprovada",
        "enviada",
        "recebida",
        "recusada",
        "cancelada",
      ],
      transferencia_status: ["em_transito", "recebida", "cancelada"],
      user_role: [
        "admin",
        "gestor",
        "operacional",
        "comercial",
        "financeiro",
        "rh",
        "almoxarifado",
        "operador",
        "cliente",
      ],
    },
  },
} as const
