#!/usr/bin/env python3
"""Recover bounded evidence from a downloaded Actions job log, without network access."""
import argparse, base64, gzip, json, pathlib, re, zipfile
p=argparse.ArgumentParser();p.add_argument('job_log');p.add_argument('output_directory');args=p.parse_args()
out=pathlib.Path(args.output_directory);out.mkdir(parents=True,exist_ok=False)
name=None;parts=[];manifest=[]
for raw in pathlib.Path(args.job_log).read_text(encoding='utf-8-sig').splitlines():
    line=re.sub(r'^\d{4}-\d\d-\d\dT\S+Z ', '', raw.lstrip('\ufeff'))
    if line.startswith('ENC_EVIDENCE_BEGIN '):
        if name is not None:raise ValueError('Nested evidence marker')
        name=line[len('ENC_EVIDENCE_BEGIN '):]
        if pathlib.PurePath(name).name!=name or '..' in name:raise ValueError('Unsafe evidence name')
        parts=[]
    elif line.startswith('ENC_EVIDENCE_END '):
        if line[len('ENC_EVIDENCE_END '):]!=name:raise ValueError('Unmatched evidence marker')
        data=base64.b64decode(''.join(parts),validate=True)
        target=out/name;target.write_bytes(data)
        if name.endswith('.jpg') and not data.startswith(b'\xff\xd8'):raise ValueError('Invalid JPEG')
        if name.endswith('.zip'):
            with zipfile.ZipFile(target) as z:
                if z.testzip() is not None:raise ValueError('ZIP CRC failure')
        if name=='results.json.gz':
            result=json.loads(gzip.decompress(data));(out/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result['stats']))
        manifest.append({'file':name,'bytes':len(data)});name=None;parts=[]
    elif name is not None:parts.append(line.strip())
if name is not None:raise ValueError('Truncated evidence')
if not manifest:raise ValueError('No evidence found')
(out/'recovered-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(f'Recovered {len(manifest)} files')
