#!/usr/bin/env python3
"""Normaliza um arquivo de tipos gerado, para comparar dois ambientes.

Duas coisas variam sem que o schema tenha mudado, e comparar sem removê-las dá
falso positivo:

  • o cabeçalho de aviso que o gerador do repositório acrescenta;
  • o bloco __InternalSupabase, que carrega a versão do PostgREST — o projeto
    remoto roda uma versão e o stack local do CI roda outra.
"""
import re
import sys

texto = open(sys.argv[1], encoding='utf-8').read()
texto = re.sub(r'^\s*//[^\n]*\n', '', texto, flags=re.M)          # comentários
texto = re.sub(r'\n\s*__InternalSupabase:\s*\{[^}]*\}', '', texto)  # metadado do ambiente
texto = re.sub(r'\n\s*\n+', '\n', texto)                          # linhas em branco
sys.stdout.write(texto.strip() + '\n')
