#!/usr/bin/env python3
"""Add/remove a Korean display layer to an existing Paperclip ui-dist; no server restart."""
import argparse, hashlib, json, re, shutil
from pathlib import Path

MARK_START = '<!-- paperclip-ko-easy:start -->'
MARK_END = '<!-- paperclip-ko-easy:end -->'

def main():
    parser=argparse.ArgumentParser(description='기존 Paperclip 화면에 쉬운 한국어 패치를 적용하거나 복구합니다.')
    parser.add_argument('--ui-dir',type=Path,required=True,help='설치된 @paperclipai/server/ui-dist 폴더')
    parser.add_argument('--restore',action='store_true',help='처음 보관한 원본 화면으로 복구')
    args=parser.parse_args()
    ui=args.ui_dir.expanduser().resolve(); index=ui/'index.html'
    backup=ui/'.paperclip-ko-easy-backup'
    if not index.is_file() or not (ui/'assets').is_dir():
        raise SystemExit('올바른 ui-dist 폴더가 아닙니다. 변경하지 않았습니다.')
    if args.restore:
        original=backup/'index.html'
        if not original.is_file(): raise SystemExit('복구할 원본이 없습니다. 변경하지 않았습니다.')
        index.write_bytes(original.read_bytes())
        print('원본 화면으로 복구했습니다. 브라우저를 새로고침하세요.'); return
    source=Path(__file__).resolve().parent
    dictionary=json.loads((source/'dictionary.json').read_text(encoding='utf-8'))
    runtime=(source/'runtime.js').read_text(encoding='utf-8')
    assert runtime.count('/*__DICTIONARY__*/ {}') == 1
    runtime=runtime.replace('/*__DICTIONARY__*/ {}',json.dumps(dictionary,ensure_ascii=False,separators=(',',':')))
    digest=hashlib.sha256(runtime.encode()).hexdigest()[:12]
    out=ui/'paperclip-ko-easy'; out.mkdir(exist_ok=True)
    script='ko-'+digest+'.js'
    (out/script).write_text(runtime,encoding='utf-8')
    old=index.read_text(encoding='utf-8')
    backup.mkdir(exist_ok=True)
    if not (backup/'index.html').exists(): (backup/'index.html').write_text(old,encoding='utf-8')
    base=(backup/'index.html').read_text(encoding='utf-8') if MARK_START in old else old
    html=re.sub(re.escape(MARK_START)+'.*?'+re.escape(MARK_END),'',base,flags=re.S)
    def korean_html(match):
        attrs=re.sub(r'\s+(?:lang|translate)\s*=\s*([\"\']).*?\1','',match.group(1))
        return '<html lang="ko" translate="no"'+attrs+'>'
    html=re.sub(r'<html\b([^>]*)>',korean_html,html,count=1,flags=re.I)
    block=MARK_START+'\n<meta name="google" content="notranslate">\n<script defer src="/paperclip-ko-easy/'+script+'"></script>\n'+MARK_END
    if '</head>' not in html: raise SystemExit('head 태그를 찾지 못했습니다. 원본을 변경하지 않았습니다.')
    html=html.replace('</head>',block+'\n</head>',1)
    temporary=index.with_suffix('.ko-tmp')
    temporary.write_text(html,encoding='utf-8'); temporary.replace(index)
    (out/'patch-info.json').write_text(json.dumps({'version':'1.0.0','entries':len(dictionary),'script':script},ensure_ascii=False,indent=2))
    print('한국어 패치 적용:',len(dictionary),'개 문구. 브라우저를 새로고침하세요. 서버 재시작은 필요 없습니다.')

if __name__=='__main__': main()
