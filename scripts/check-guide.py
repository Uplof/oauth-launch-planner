#!/usr/bin/env python3
"""Checks guide JSON files against research/GUIDE-FORMAT.md. Usage: python3 scripts/check-guide.py src/data/guides/hubspot.json [...]"""
import json
import re
import sys

KEYS = ['slug', 'name', 'category', 'sample', 'difficulty', 'headline', 'firstTest', 'production', 'approvalWait',
        'whoCanRegister', 'testMode', 'actions', 'steps', 'blockers', 'agentCan', 'youDo', 'drafts', 'sources',
        'unconfirmed', 'screenshots', 'checked']
CLAIMS = ['firstTest', 'production', 'approvalWait', 'whoCanRegister', 'testMode']
PROOFS = {'docs', 'community', 'unconfirmed'}  # "tested" is ours only, after a hands-on test


def check(path):
    errs = []
    try:
        g = json.load(open(path))
    except Exception as e:
        return [f'not valid JSON: {e}']
    for k in KEYS:
        if k not in g:
            errs.append(f'missing key {k}')
    if errs:
        return errs
    if not re.fullmatch(r'[a-z0-9_]+', g['slug']):
        errs.append('slug must be lowercase letters, digits or _')
    if g['sample'] is not False:
        errs.append('sample must be false')
    if g['difficulty'] not in {'easy', 'moderate', 'hard', 'gated'}:
        errs.append('bad difficulty')
    if g['screenshots'] != []:
        errs.append('screenshots must be []')

    def proof(where, obj, need_source=True):
        if obj.get('proof') not in PROOFS:
            errs.append(f'{where}: proof must be docs, community or unconfirmed')
        elif need_source and obj['proof'] in {'docs', 'community'} and not str(obj.get('source', obj.get('link', ''))).startswith('http'):
            errs.append(f'{where}: a {obj["proof"]} claim needs a source URL')

    for k in CLAIMS:
        c = g[k]
        if not isinstance(c, dict) or not c.get('text'):
            errs.append(f'{k}: needs text')
        else:
            proof(k, c)
    if not 3 <= len(g['actions']) <= 6:
        errs.append('need 3-6 actions')
    for a in g['actions']:
        for f in ['id', 'label', 'scope', 'level', 'review', 'proof', 'timeToLive']:
            if not a.get(f):
                errs.append(f'action {a.get("id")}: missing {f}')
        if a.get('level') not in {'basic', 'sensitive', 'restricted', 'partner'}:
            errs.append(f'action {a.get("id")}: bad level')
        proof(f'action {a.get("id")}', a, need_source=False)
    if not 6 <= len(g['steps']) <= 10:
        errs.append('need 6-10 steps')
    for s in g['steps']:
        for f in ['title', 'detail', 'owner', 'time', 'proof']:
            if not s.get(f):
                errs.append(f'step "{s.get("title")}": missing {f}')
        if s.get('owner') not in {'agent', 'you', 'provider'}:
            errs.append(f'step "{s.get("title")}": owner must be agent, you or provider')
        proof(f'step "{s.get("title")}"', s, need_source=False)
    if not 3 <= len(g['blockers']) <= 6:
        errs.append('need 3-6 blockers')
    for b in g['blockers']:
        if not b.get('title') or not b.get('fix'):
            errs.append('blocker needs title and fix')
        proof(f'blocker "{b.get("title")}"', b, need_source=False)
    if not 2 <= len(g['drafts']) <= 3:
        errs.append('need 2-3 drafts')
    if len(g['sources']) < 3 or any(not str(s.get('url', '')).startswith('http') for s in g['sources']):
        errs.append('need 3+ sources, each with an http URL')
    if 'composio' in json.dumps(g).lower():
        errs.append('mentions Composio (not allowed)')
    return errs


bad = 0
for p in sys.argv[1:]:
    e = check(p)
    print(('OK   ' if not e else 'FAIL ') + p)
    for x in e:
        print('     - ' + x)
    bad += bool(e)
sys.exit(1 if bad else 0)
