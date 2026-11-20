# GITHUB_CLEANUP_AUDIT

**Operación:** ENC-GITHUB-CLEANUP-001
**Repositorio:** dJeoMed78/Encarmenorg
**Fecha de ejecución:** 2026-11-20
**Alcance:** encarmen.org y staging.encarmen.org; excluye JARVIS, FreeLLM y otros proyectos.

## 1. Resumen obligatorio

- **Ramas iniciales:** 203 referencias remotas reales (204 elementos remotos al contar el ref simbólico `HEAD`; se excluye `HEAD` del conteo de ramas reales).
- **Ramas eliminadas:** 39
- **Ramas conservadas:** 165
- **Método:** eliminación individual por SHA/refs/heads con verificación posterior de 404 en GitHub.
- **Criterio aplicado:** PR integrada + no Issue abierto + sin parches exclusivos frente a `main` o `ia-desarrollo`.

## 2. SHAs protegidos

| Rama | SHA inicial | SHA posterior | Resultado |
|---|---|---|---|
| main | a201a3bc049f4a5c0e609e96023ebad16ebc7ff1 | a201a3bc049f4a5c0e609e96023ebad16ebc7ff1 | Sin modificación |
| ia-desarrollo | deba0415e22eb5ff2ebd5bd54ee68ee268594e8c | deba0415e22eb5ff2ebd5bd54ee68ee268594e8c | Sin modificación |
| coord/encarmen-work-control-001 | Conservada | Conservada | Rama operativa protegida |
| work/enc-control-ops | Conservada | Conservada | Rama operativa protegida |

## 3. Ramas eliminadas

| Rama eliminada | SHA HEAD inicial | PR relacionada | Motivo individual | Verificación |
|---|---|---|---|---|
| `coord/enc-c4-final-001` | `9b73f3366a14e34c9200c2f8f6aa0afcb6251c81` | #7 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `coord/enc-pi-apply-flags-20261101` | `a221cc86365aa9af0f31c360e796e45dd54f1666` | #38 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `coord/enc-pi-inline-login-ios-20261101` | `0e3efe59d8ec9cdb2ee0e746509eab383043d3ea` | #37 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `coord/enc-public-registration-gate-20261030` | `71bf64c24894ba3edc396c217722b5a346787833` | #18 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `coord/enc-sec-deps-20261031-001` | `98084d3433485b313fa117a2f106e396e2bf568d` | #23 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `coord/enc-staging-005-gate-audit-20261030` | `c29bde6e78410d6191a07c9fbb79be81b0b3b5c3` | #16 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `coord/enc-staging-005-integration-20261030` | `22d5003c40266c1a605ad165b7c57d76287de9d9` | #15 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `coord/enc-staging-admin-login-ui-20261030` | `d57912edf019cd79025c54e0f466180a9e0c509f` | #17 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `coord/enc-staging-business-delete-20261030` | `d128f099d28b2c13fe82b0377ceead77b8525972` | #20 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `coord/enc-w5-node22-validation-001` | `001cef416dbcc0c3bc8f86692f7ef21afe50c28a` | #10 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `hotfix/prod-vite-build-whatsapp-20261030` | `8ddf40bdd2164bbf81a46299be745598fd7ab4f9` | #9 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-034-glass-staging-release-nia` | `25bb540754d51714d5ca1eeada8c89b511eba085` | #74 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-034-remove-runtime-debug-nia` | `e9b5ea3449df8185819795a1fee95f8917ac23f8` | #78 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-034-review-toast-001-nia` | `dea7a42a77b749d3922116b7378a671e3f7c89c2` | #81 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-034-runtime-authorization-debug-nia` | `8537df78f0190affd7fb1b7ada3b8d1f8dabf1b6` | #77 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-admin-session-stability-20261103` | `951cb5494355230a63073b3da88959756da2fa38` | #44 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-business-gallery-cover-separation-019-nia` | `688c6c0e0dd591e9696eb8243d916838cbdc8c44` | #84 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-classifieds-local-sources-061-nia` | `b926f1dc5b30fab27f7050899d925ccee1b67bd2` | #61 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-classifieds-review-gate-062-nia` | `9c6d1aea2592b9f99920821d73d8f7cb66fa3b43` | #62 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-control-auto-execute-instructions-101` | `e87e7dbefa8fc45cd187ed04c96ed432d53498c4` | #101 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-control-board-20261113` | `bc3722e3f32e42da3d7f399f70bc2664ba65ed58` | #95 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-control-http-check-20261113` | `cc2dae0f0304217576d8c8c366fe2201647a7d26` | #96 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-control-instructions-nia-20261113` | `4a7978ddffc3e6be5f88a40808521d6fc76d1616` | #97 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-denue-admin-token-043` | `5c9bccc16dbf74f8d8384b76748c15eb246be406` | #118 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-footer-build-sha-060-nia` | `9f8d6dc54a31866c1dee2ca0143e0ca7915ab7a5` | #60 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-gas-002-admin-scroll` | `a60fd76643d28622c257619db668da807ee975ea` | #112 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-gas-003-ci-regression` | `d6bd3237ddfd0b916306be8a1c497ed9d8b8e07f` | #113 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-glass-business-detail-001` | `f3046a1354057ed09f4bed3b007545aeb186ea59` | #4 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-logo-patch-response-fix-001` | `a74487179e3b461852693c9b841dac4adc0120dc` | #50 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-maps-auto-load-033` | `4756a6633ffaed3a0c9602b663a2ef9462965a8d` | #51 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-maps-embed-032-coordination` | `d0963d996118c478107896c182f53dcafad85be7` | #49 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-pi-admin-session-029` | `090f93978c8917b7c8a5aab95f2de60139e08b7f` | #36 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-ratings-034-staging-activation-nia` | `7ac876c13f9199ce5d5abced50e167e25e118031` | #69 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-ratings-034-staging-release-nia` | `fa0ae7624dcad0942b55ca10d1d3860d5e9aeda8` | #71 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-reviews-006` | `c0f9893305e4b2809cd64a42f6421fc512ccb974` | #2 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-sec-ssrf-img-20261109-001-nia` | `7e370c27af96ca416334cd14d9e279eeb7b906a1` | #91 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-sec-ssrf-img-prod-20261112-nia` | `72419da79a5bb6795153234f4a0fe8d5fb07917f` | #92 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-staging-footer-063-nia` | `45628a99177882f08ee59aee0fd011de9a75679d` | #63 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |
| `work/enc-staging-footer-runtime-064-nia` | `680c7fbbfa2423248d924116479297a012afa64b` | #64 integrada/merged | Trabajo terminado y contenido integrado o equivalente; sin parches exclusivos útiles; sin Issue abierto. | VERIFIED_DELETED |

## 4. Evidencia posterior

- Las 39 referencias eliminadas respondieron inexistentes tras la operación.
- `main` conserva el SHA inicial `a201a3bc049f4a5c0e609e96023ebad16ebc7ff1`.
- `ia-desarrollo` conserva el SHA inicial `deba0415e22eb5ff2ebd5bd54ee68ee268594e8c`.
- Las 9 PR abiertas conservan sus ramas; la rama documental `enc-github-cleanup-audit-enc001` se añadió después de la limpieza.
- Las PR integradas siguen disponibles en GitHub; no se eliminaron PR ni Issues.
- No se ejecutó `git push --force`, reescritura, despliegue, modificación de tags ni eliminación masiva.

## 5. PR abiertas verificadas

| PR | Rama | Estado |
|---|---|---|
| [#55](https://github.com/dJeoMed78/Encarmenorg/pull/55) | `work/enc-radar-empresas-043-gas` | Abierta; conservada |
| [#56](https://github.com/dJeoMed78/Encarmenorg/pull/56) | `work/enc-radar-empresas-043-nia-lock-fix` | Abierta; conservada |
| [#65](https://github.com/dJeoMed78/Encarmenorg/pull/65) | `work/enc-staging-release-064-verification-nia` | Abierta; conservada |
| [#68](https://github.com/dJeoMed78/Encarmenorg/pull/68) | `work/enc-radar-empresas-043-final-gas` | Abierta; conservada |
| [#72](https://github.com/dJeoMed78/Encarmenorg/pull/72) | `work/enc-034-staging-observe-nia` | Abierta; conservada |
| [#88](https://github.com/dJeoMed78/Encarmenorg/pull/88) | `work/enc-seo-soft404-001-nia` | Abierta; conservada |
| [#90](https://github.com/dJeoMed78/Encarmenorg/pull/90) | `work/enc-seo-routes-001-nia` | Abierta; conservada |
| [#93](https://github.com/dJeoMed78/Encarmenorg/pull/93) | `work/enc-int-007-persistence-nia-20261112` | Abierta; conservada |
| [#111](https://github.com/dJeoMed78/Encarmenorg/pull/111) | `work/enc-gas-001` | Abierta; conservada |

## 6. Ramas pendientes de revisión

Las siguientes categorías no se eliminaron por tratarse de trabajo activo, respaldos, coordinaciones o evidencia que requería conservación:

- Ramas vinculadas a PR abiertas: las 9 ramas listadas arriba.
- Issues abiertos relacionados: `ENC-F009` (#6), Radar clasificados #41, Radar eventos #42, Radar empresas #43 y SEO #85. Sus ramas relacionadas se conservaron.
- Issue #119 (FreeLLMAPI) fue excluido de la limpieza por la restricción absoluta de no incluir otros proyectos/proyectos externos.
- Ramas `backup/*`: conservadas como respaldo histórico.
- Ramas `audit/*`, `coord/*`, `experiment/*` y ramas de trabajo con commits exclusivos o sin PR integrada: conservadas por duda o evidencia técnica necesaria.

## 7. Inventario final completo de ramas conservadas

```text
enc-github-cleanup-audit-enc001	added-for-audit-report
audit/enc-prod-ssrf-readonly-20261112	2415601e34f5b1b97861bafc0dc3a0eaf5a2f697
audit/staging-runtime-readonly-20261112	8d9c87d764064a642bbd68c748768078f79c9450
backup/coord-before-staging-deploy-pr53-20261103	eb17861a261dbf211e80f9593f7bf1039dd41ac5
backup/coord-before-staging-inspection-20261103	9bf9d16c8ce264688551bee9aafffbd00c8a4c84
backup/ia-desarrollo-before-auto-maps-20261103	d39e2ec68aa3f839ad28c522be70ac0395838d6c
backup/ia-desarrollo-before-cover-019-20261103	6748be085f514362729d73283b4e4a701d164c22
backup/ia-desarrollo-before-maps-032-20261103	302ed2adc5d259108bed708c1ad6949db17188a2
backup/ia-desarrollo-before-pr52-20261103-02	a52f5ac101f758ba373c2c3f6135e54a84a72b2b
backup/ia-desarrollo-before-release-stamp-20261103	7affd0ac66effbba001ae996889f18b3299dba30
backup/pr52-head-before-admin-cover-20261103	5619c0d915ae2d27525e18b3b998dd5f94811148
coord/enc-consolidation-fixes-002-review-001	45b6585acd3f6db27ce0c5e3b8b4be589e1f8ec6
coord/enc-f007a-completion-001	73a68214cb326283375a8fe5e5ceeb669cee6d49
coord/enc-hostinger-readonly-inspection-001	4bd9f55452a9ac529f2e5d12a290a06508055dfc
coord/enc-media-regression-guard-20261031	c6e1bb54ab9e37bf60f5893a6324199d0b11544c
coord/enc-promo-image-integrity-review-001	73d56e36c43050f265cf32031376277689ea01c6
coord/enc-report-persistence-001	aa5260cf16a08539e04f4225056e152472302c57
coord/enc-staging-005-diagnostic-20261030	a8f89b800da12455ee4e67b045fdba821f1e7a91
coord/enc-staging-005-e2e-20261030	4c02a1171af09f40932b14db9ce3a1c112df9e44
coord/enc-staging-005-live-permanent-20261030	4c02a1171af09f40932b14db9ce3a1c112df9e44
coord/enc-upload-honest-result-001	79757de8cfb07317668553c02a37502de4b64366
coord/encarmen-classifieds-backend-fixes-001	f5a03d20b398f7c0ab0e5cebd75bdd4ffbb8fe4b
coord/encarmen-classifieds-integration-001	afa344a291a2f64354989c890f8f55dad0a2af7c
coord/encarmen-gas-client-fixes-001	df852dc40c323b3b72faa5456ecc4276e28e0301
coord/encarmen-staging-candidate-001	7e7818166beecb9e3905aa8af83ec61f7d993737
coord/encarmen-work-control-001	b5213f56b841cc8bdcc1ed64c7e259df50a081c5
coord/nia6-staging-delete-gate-20261031	1dde6a5a0db8e78bb3b9b48b62944e24654cd591
coord/prod-hostinger-proof-20261030	2bab8b908dd36b164b919f207112574305fdd366
coord/prod-whatsapp-verify-readonly-20261030	b4a74c0de9ccd8a8828bb15d2d4028b03989cdda
coord/radar-classifieds-fix-001	3d13ccc475a91e845f10040ed5794698ec813a47
coord/staging-admin-env-origin-fix-20261030	793ba3a4343d4dc7db4138e47006dffbba90548c
coord/staging-admin-login-window-20261030	7534b05643fc0bc2bdbda8b2b492571afb6a1ed7
coord/staging-business-enable-20261030	5e99d2e9de00ad0b990c5dd1aff29dae653e07d2
coord/staging-db-preflight-20261030	1a2aa29c8ca24812a59d75ecb60d0d811a4243e6
coord/staging-env-guard-fix-20261030	34a9f2b19020f86f4fc11148c328706a06817e80
coord/staging-env-source-check-20261030	19e6b663b93b4d47365e267f3a5086a2dd7c72ae
coord/staging-functional-audit-20261030	e80b8797fc8c19c1f05aa9b9f8bbfc1a2e333d57
coord/staging-hair-contact-fix-20261030	21ccc3bdc6dabfaa7fdd6f56e61e2ea521d75b8f
coord/staging-http-persistence-test-20261030	defdac8231eebcc718f4c1e751ad0ec03b9705cd
coord/staging-http-readonly-diagnostics-20261030	402ac3fc311612e18557850f5b377204027c3bb3
coord/staging-marker-init-20261030	fd9729741f9ca15dd03e750e3f9c15f0d606d924
coord/staging-origin-deploy-20261030	0d09e02efc9f96f0e589c4604a1dc6f61f30c1d5
coord/staging-postrestart-e2e-20261030	e226eec1557a16713a327ea24051f8ac5329ea21
coord/staging-public-browser-validation-20261030	f0d80c861b202f4cbbc5836b3cd93765abb0b066
coord/staging-public-e2e-20261030	7bb10b6a050b43923a33f2d96a940a666559e024
coord/staging-registration-write-safety-20261030	b43dbac8a44faf3a0d794d8850ca53adb109b706
coord/staging-runtime-map-20261030	b0b9caf0f2251a4a9bc2ee10346d9d3cbeca7602
coord/staging-safety-readonly-20261030	9c57ddd372d27c89f474712cdd9f786c9f502638
coord/staging-unix-http-e2e-fix-20261030	dd0d3c60f558eabc9ec914d95492a1274a99b860
coord/staging-write-go-no-go-20261030	1b35eb88bea2daf4443342a0b3eff0e55e1b518c
coord/staging-write-readiness-20261030	b34f8887402ac38ae0dcce168b373de05ac97459
copilot/check-github-storage-usage	9c1a1ca8bb0ed0bffe14bfcb175fef3733d38fa1
copilot/enc-staging-write-gate-005-resolver-http-503	52e6725df4fc892a8d36dcf4fe6247d9be24dcc3
experiment/copilot-eval-001	75e16936f990846de7177b55d2f059fb49417714
experiment/copilot-sdk-hostinger-20261117	b9c47381573cc6ba3d3cbdd44a92a55b8d552af2
experiment/freellmapi-evaluation-20261116	362891a639fe149ee427088f89b408aa11019d6f
google-ai-studio-limpieza	dcc9e09b320e53d8829b11dfb8ffc5121f4fa2df
hotfix/prod-whatsapp-duplicate-52-20261030	0afc5d7606fa2c0272d622e7ffffa7200863c682
ia-desarrollo	deba0415e22eb5ff2ebd5bd54ee68ee268594e8c
main	a201a3bc049f4a5c0e609e96023ebad16ebc7ff1
work/ENC-APP-INTEGRATION-001	0d231cb2779b7a14d8d336fc2f4de3782663c738
work/ENC-BACKUP-SECURITY-002	e8541290e082b8cfebe24086b782f3e0ff5d5045
work/ENC-DEMO-STATIC-PACKAGER-001	f2c071e229784342c44eb7a1456da4706eddc473
work/ENC-GOOGLE-DEV-ISOLATION-001	6c9c12c119068cf092f3f5854e63193f1d2fda84
work/ENC-STAGING-ENV-READINESS-001	6bcfcff47c50ea6ed50beacbf444d513c7288b6e
work/ENC-STAGING-INTEGRATION-READINESS-001	d79f67837f9173181b2265373f001a9b73d5c7f3
work/ENC-STAGING-RELEASE-001	66faa550de82925f6a9f04cdc135977068a2463b
work/ENC-STAGING-SECURITY-RELEASE-001	b6b26fefcce0b4d268ba0f715433d2d534e0b1a2
work/ENC-VISUAL-DEMO-001	20cdaedc1bf7a7dcd3a1ada3a67acb73e3f7d1fb
work/enc-034-activate-ratings-staging-nia	62e7f7aa5869da72c3ea422e16bd3f32b2c28fa4
work/enc-034-final-release-check-nia	cc36ae57f8f7bb6f1a5c44355676c300f9439fdd
work/enc-034-glass-release-check-nia	cfaf9c139af90556c9b13e2e1ef4f08d63e3afa3
work/enc-034-glass-two-column-nia	1b95bfe9d8d1e6805e63ad70513f89116c152c53
work/enc-034-public-reviews-glass-cards-nia	a2d7530275b7d6159921486df852a9e049832e56
work/enc-034-staging-observe-nia	a442ca349eee7952657a1c7a48a9b16a60281c49
work/enc-admin-auth-security-001	31cb31c7a51c2ae2ad8a457b4fc902991575dcfe
work/enc-browser-e2e-001	5f188b199f87e745e44bef928137e7c09cb5f941
work/enc-build-server-artifact-fix-20261113	7d834368f19603d28fed20b5e2d26b106cdfbba5
work/enc-business-detail-logo-hero-20261103	935bac1a4dc2eeef84525544c03b97ddd579815a
work/enc-business-ui-fix-001	42061410915404980cc49abee7b1e8f5810934a4
work/enc-c4-fixture-repair-006	33befcae02cac7ee705899ff5da2f76c29d53c1a
work/enc-c4-promo-closure-copilot-001	be0797994cd9939b2a564c05b6f803084de26116
work/enc-classifieds-backend-001	49b8e52b2c594a0bc0bc9b9b261410392106febc
work/enc-classifieds-integration-002	328939caeab4801b33070b13f0b70826d9bc752d
work/enc-classifieds-ux-001	067a3b0e2015397dc33862da475cc5b0eb4ae208
work/enc-consolidation-001	a16ca710449eda3c68f26016b91ce59d55b95b2b
work/enc-consolidation-fixes-002	e60582e971f4f8cb56ea56191d33d91824f3fc5e
work/enc-control-instructions-auth-100	8f32f908b19273fb0e3082a22b1bf16aa03e11b1
work/enc-control-journal-diagnosis-098	493864f5df99415cf59325b6279b28a6bc3db795
work/enc-control-ops	e6e0789dfe7cbf918cd767bbdcdea963b5ffb3ac
work/enc-control-table-clarity-103	1fbd1f32831a8f4b4140b4a801dafe9f71751848
work/enc-control-visual-progress-102	e14f081917c20653d09d5e480a7a7e502c7a35ea
work/enc-cover-brand-fallback-20261103	9c78cef7eebc45518b29fb186788c7a5a491a5e9
work/enc-data-integrity-001	84819002a20857fee3e5f668189a615ef9a43618
work/enc-data-integrity-closure-003	74e3300fa9ff022153d7e6671c65362203258032
work/enc-f007a-mobile-order-001	18668778bcce0a179c66ae5540de909da478c8f0
work/enc-f008-contactos-visibilidad	d826a17b6f4bd29eaac1ef350111910ab2dfe872
work/enc-f008-r3-recuperacion	924127e1b76919918c87ce9563d8b0de62a3d373
work/enc-gallery-to-logo-20261103	648cfbf6edd3ebd66a001f813d97ccc689732fa6
work/enc-gas-001	46ea9bcc0432dd10004ff70d51d8f0b2cf9f300f
work/enc-gas-004-contact-filters	e6f8255aff175c9343079fe29b3be039b4164543
work/enc-glass-editor-001	13326fdf616c45a0322ce1b1cd52973a264d1f83
work/enc-glass-logo-maps-002	62dd05a1ba734ae035bb0792f09c0fbe6b3a00ca
work/enc-glass-save-toast-20261103	a4eff524bd93c7a802bc044a42c3ab327dd4576a
work/enc-hostinger-build-optimization-001	cfdd28db8b59d1d6808a9f2cf003140937443eae
work/enc-int-007-persistence-nia-20261112	5c65bf38a80cddeeda16748754174a678e9c7f6d
work/enc-integration-readiness-005	f3ab2b4ea616fe2c56c674e0672a093f0fb6b9d6
work/enc-integration-validation-001	c34aa4318d95b86b0c53378180223c5c088c5d4a
work/enc-mariadb-ci-real-002	e1ed1189f62087be7f149ae0e5495f786b55f87a
work/enc-mariadb-persistence-test-001	03d8f2f54f88e7383b8bbc51d51f67f9c5c6e708
work/enc-mariadb-real-test-001	e53ba79f9fda5115d813f418e6ffcc0b624b94ae
work/enc-media-canonical-20261113	5db91ebbc638abeaf18b5361d3164827d68d41bf
work/enc-pi-feedback-session-20261103	9288e2b92ba0367eb26cb6de75c52f73d3a24e9e
work/enc-prod-contacts-fix-001	b24e38e3957a89a8645e7e21cb5cb9becc062b55
work/enc-promo-image-integrity-001	98ca8ad32a7f920681066b5a22a69d8696a53fe4
work/enc-public-admin-cover-019	81949d1ea7973df50bfecb050c0f757d175278e2
work/enc-public-detail-ux-001	174cb16fff855a16b8bbe5ac083f88140c31924f
work/enc-public-media-enable-inputs-20261031	41edf5816436e5b18d0daa8498291cfe3ec5bacc
work/enc-public-registration-001	1572a1dd9cbe31c1870a026ac947d3bfcfc877c5
work/enc-public-registration-integration-001	184874835d9d588e679b201b790643dfd923aff8
work/enc-public-registration-ui-001	8435e7f94b0cee3d7f0623b966ed5cf3578a6283
work/enc-radar-clasificados-041-nia	d5b056fcc07838164b57bb871a4528e3f60b566c
work/enc-radar-empresas-043-final-gas	ddea6e2cad06ca96b7a4a41bbff5d8bde878b96e
work/enc-radar-empresas-043-gas	51ce1b192a8754764ae3ddb5069e4c746cb39534
work/enc-radar-empresas-043-nia-lock-fix	ac3f6c586b75b2b340d5ec1ed66877ce7095f959
work/enc-radar-empresas-043-w1-denue-001	a2d9edb0b2fea39b6f674324959a8510f253ab4f
work/enc-radar-reliability-002	f748a4c63f90406541c4aae90675ff1bebd2593f
work/enc-radars-041-043-integration-nia	833f1b34c4b091939a561d09d12265043b8ff14c
work/enc-radars-041-043-staging-preflight-nia	3b52154af6c5a61f35642fc1d5ae78a80629ce2a
work/enc-radars-staging-deploy-observer-nia	d6687731c1624ed510d1e024090459311810917d
work/enc-ratings-034-comment-before-submit-nia	fa56eaf4ebb6d2ae0bf84bb34abd72d62c2b58a8
work/enc-ratings-034-live-staging-nia	13b7b91cc464ba9e856c07d3dcccef5761cef996
work/enc-ratings-034-moderation-context-nia	e762401f0b4f0b23a4b2f26518337eefb11d5e74
work/enc-ratings-comments-034-nia-completion	8b6e8ee8777d6e53d82db5de9dfd94e8ce1b5f98
work/enc-ratings-comments-034-w1	86863c11fb06884e48d9c643469d1e345a2e865e
work/enc-remove-wp-woo-references-20261113	51f6a09a05bfe58a9862753fa17b9a0c8d4433fd
work/enc-reviews-001	a6819631fb9925deb5aeedce7b9b9b40e77454e7
work/enc-reviews-003	2e0d007879d474d3afbf378ecdadb06660c64d6a
work/enc-reviews-comments-002	621684a8dff5c8471cbf17a33676c56724bead0e
work/enc-sec-ai-auth-20261113	b625f33693df2d7b42c88b8a6916d551188aafa9
work/enc-security-containment-003	22ce2a30741bf9145acbb2b939d1d6a936c1843f
work/enc-security-legacy-credential-removal-20261113	a4cea7aedbac85fd20edf763c604d98ffac2914c
work/enc-security-radar-001	809dc7c05a8a633fc21379ad2121345b3aae71c7
work/enc-seo-indexing-001-nia	d540ef130cd931531d0689177b2d64ba46c0f053
work/enc-seo-production-001-nia	e5a6500b308a332402666c2e6d087a74e724be33
work/enc-seo-routes-001-nia	70b432eef38825d996d117a9006a0fe53b8f50f1
work/enc-seo-soft404-001-nia	2cd338172f1d5d45f35f30700fd7d7ffb1cb430a
work/enc-staging-admin-media-fix-20261031	db243227d3f7ccd97e74f3ceaa3a767215b0c684
work/enc-staging-candidate-closure-004	c79992a385213b437541cb92954c76a99c2485b1
work/enc-staging-candidate-closure-004-r1	797fb5e918c2228721cb099d94c5a2914201a5f5
work/enc-staging-http-e2e-closure-001	07d90c1bc4726c3088d815d922b1951bf5ccc736
work/enc-staging-public-media-001	04238e6425bb8f0cb5aaf74340ad71fc81a9113b
work/enc-staging-release-064-verification-nia	ecec42a79f62948c50e05faf861a52f45fbee6f4
work/enc-staging-runtime-diagnostic-20261113	9647a6612636b0c447d5f59b6bbfb74d04d67001
work/enc-staging-security-smoke-20261113	a139390991ee9b77eed00622dcb32711b54132a8
work/enc-staging-verifiable-release-stamp-20261103	4ae8b6c6781f9c5f7c1aee1a8975e3e5b9750c5f
work/enc-staging-write-001	0e2488f5552bf7768a15711316b0de4d71b5d17e
work/enc-staging-write-gate-005	aaf59b1814d9cff1adac66822200f11ef5999b45
work/enc-staging-write-gate-005-gas	bd8d30a4f2a5b21e8d755e574a39522ab916c554
work/enc-ux-pi-030	00c5010b20c2a473c920389e94d367e722c1f2d8
work/enc-woo-retirement-cleanup-20261113	3a2779579fd442e4cf36499c59494b322acdd3c2
work/enc-woocommerce-retirement-104	59d9f526d9eb0e25c1dc556c7dfa387114556f23
work/enc-woocommerce-retirement-104-rebased	cca4fd6d01525099d80ad797971a2718967c8a6e
work/enc-write-validation-001	26baeb5807abd4ade214e051332d0482e96b5881
work/verificacion-acceso-001	d48a3367805b21e1e49cb1aac05fe835dbe5748f
```

## 8. Criterio de cierre

- Eliminaciones verificadas en GitHub: sí.
- Ningún cambio útil perdido: verificación conservadora; solo se eliminaron ramas con PR integrada y sin parches exclusivos frente a una rama conservada.
- Ramas activas conservadas: sí.
- Inventario final documentado: sí.
- SHAs de ramas eliminadas documentados: sí.
- SHAs finales de ramas protegidas comprobados: sí.

 
## Segunda fase — revisión de ramas históricas (2026-11-20)

**Estado: revisión parcial en curso; no se eliminaron ramas en esta fase.**

Inventario actual consultado directamente por paginación: 165 ramas (100 + 65). Se confirmó que las dos ramas mencionadas en una sesión previa de navegador no se habían eliminado entonces; no usar ese reporte anterior como prueba. La primera depuración de 39 ramas sigue sustentada por el expediente Copilot y conteo actual.

### Comparaciones de historial ejecutadas
Comparaciones realizadas contra main e ia-desarrollo:

| Rama | main ahead/behind | ia-desarrollo ahead/behind | Decisión |
|---|---:|---:|---|
| backup/coord-before-staging-deploy-pr53-20261103 | 305/13 | 270/394 | CONSERVAR; respaldo divergente |
| backup/coord-before-staging-inspection-20261103 | 303/13 | 268/394 | CONSERVAR; respaldo divergente |
| backup/ia-desarrollo-before-auto-maps-20261103 | 201/13 | 0/228 | CONSERVAR; snapshot histórico de ia |
| backup/ia-desarrollo-before-cover-019-20261103 | 204/13 | 0/225 | CONSERVAR; snapshot histórico de ia |
| backup/ia-desarrollo-before-maps-032-20261103 | 191/13 | 0/238 | CONSERVAR; snapshot histórico de ia |
| backup/ia-desarrollo-before-pr52-20261103-02 | 205/13 | 0/224 | CONSERVAR; snapshot histórico de ia |
| backup/ia-desarrollo-before-release-stamp-20261103 | 206/13 | 0/223 | CONSERVAR; snapshot histórico de ia |
| backup/pr52-head-before-admin-cover-20261103 | 218/13 | 14/225 | CONSERVAR; respaldo divergente |
| audit/enc-prod-ssrf-readonly-20261112 | 7/9 | 11/429 | CONSERVAR; evidencia de auditoría con commits exclusivos |
| audit/staging-runtime-readonly-20261112 | 376/13 | 4/57 | CONSERVAR; evidencia runtime divergente |
| coord/enc-hostinger-readonly-inspection-001 | 135/13 | 100/394 | CONSERVAR; evidencia Hostinger exclusiva |
| coord/enc-media-regression-guard-20261031 | 154/13 | 4/279 | CONSERVAR; guard de regresión exclusivo |
| coord/enc-consolidation-fixes-002-review-001 | 76/13 | 2/355 | CONSERVAR; revisión técnica exclusiva |
| coord/enc-f007a-completion-001 | 81/13 | 7/355 | CONSERVAR; trabajo de finalización exclusivo |
| coord/enc-promo-image-integrity-review-001 | 81/13 | 7/355 | CONSERVAR; evidencia integridad imágenes exclusiva |
| coord/enc-report-persistence-001 | 79/13 | 5/355 | CONSERVAR; evidencia persistencia exclusiva |

Los valores son conteos de commits de comparación, no una afirmación de que todos sean cambios funcionales únicos. Divergencia y commits ahead obligan a revisar patch equivalence/PR/Issue antes de decidir. No son por sí solos motivo para borrar.

### Decisión de seguridad
- Cero ramas eliminadas en segunda fase.
- Se conservaron los 8 backups, 2 audit y 6 ramas coord examinadas arriba porque muestran divergencia/commits exclusivos o valor probatorio no sustituido.
- No se modificaron main, ia-desarrollo, producción, Staging, tags, commits, PR ni Issues.
- Pendiente: revisión individual de las restantes ramas coord, copilot, experiment, hotfix, google-ai-studio-limpieza y work históricas sin PR abierta. Verificar Issue/PR, patch equivalence y respaldos antes de cualquier baja.
- La rama de auditoría permanece fuera de la aplicación; no confundirla con código desplegable.

### Siguiente acción exacta
Continuar el inventario de ramas históricas desde la lista de 165 del apartado 7. Para cada rama, consultar PR/Issue y comparación; identificar cambios equivalentes con main/ia-desarrollo. No borrar respaldos sólo por antigüedad. Retirar únicamente referencias con evidencia concluyente de sustitución y ausencia de valor de recuperación; verificar 404 individual y actualizar este documento y memoria Drive.
