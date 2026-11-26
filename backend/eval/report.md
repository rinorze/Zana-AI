# ZANA retrieval evaluation

Run: 2026-11-26 11:14 UTC · 26 in-scope questions, 4 off-topic · top_k=5

The questions are hand-written test questions (SQ/EN/SR) about the 20 seeded services, not real user logs.

Embeddings: `gemini-embedding-001` · relevance threshold (max cosine distance): 0.33. The threshold was chosen from this same question set, so treat the refusal score as optimistic.

| Metric | Value |
|---|---|
| hit@1 | 92% |
| hit@5 | 100% |
| MRR | 0.952 |
| grounded | 100% |
| refusal | 100% |

## Per question

| Lang | Question | Expected | Rank | Grounded | Best distance |
|---|---|---|---|---|---|
| sq | Sa kushton pasaporta për të rritur? | pasaporta | 1 | yes | 0.158 |
| sq | Çfarë dokumentesh më duhen për pasaportë për fëmijën? | pasaporta | 1 | yes | 0.162 |
| sq | Ku mund ta nxjerr letërnjoftimin e parë kur mbush 16 vjeç? | leternjoftim | 1 | yes | 0.096 |
| sq | Si ta marr certifikatën e lindjes online? | certifikate-lindjeje | 1 | yes | 0.163 |
| sq | Më duhet certifikata e martesës për vizë, ku aplikoj? | certifikate-martese | 1 | yes | 0.188 |
| sq | Si regjistrohet një SH.P.K. në ARBK? | regjistrim-biznesi | 1 | yes | 0.157 |
| sq | Sa kushtojnë provimet për patentë shoferi? | patente-shoferi | 1 | yes | 0.124 |
| sq | Më duhet vërtetim që nuk jam i dënuar për punë | certifikate-padenimi | 1 | yes | 0.183 |
| sq | Si e marr ekstraktin e pronësisë për shtëpinë? | ekstrakti-pronesise | 1 | yes | 0.187 |
| sq | Kur kam të drejtë për pension pleqërie? | pension-pleqerise | 1 | yes | 0.191 |
| sq | Si ta legalizoj diplomën e marrë jashtë vendit? | legalizim-diplome | 1 | yes | 0.150 |
| sq | Si e regjistroj veturën e blerë nga jashtë? | regjistrim-automjeti | 4 | yes | 0.295 |
| sq | Si e marr numrin fiskal për biznes të ri? | numri-fiskal | 1 | yes | 0.169 |
| sq | Kur duhet të regjistrohem për TVSH? | regjistrim-tvsh | 1 | yes | 0.142 |
| en | How much does a passport cost in Kosovo? | pasaporta | 1 | yes | 0.157 |
| en | What do I need to renew my ID card? | leternjoftim | 1 | yes | 0.256 |
| en | How do I get a death certificate for a family member? | certifikate-vdekjeje | 1 | yes | 0.276 |
| en | I am a foreigner, how do I get a residence permit? | leje-qendrimi-huaj | 1 | yes | 0.214 |
| en | How do I prove I am not married? | certifikate-gjendjes-martesore | 1 | yes | 0.252 |
| en | Where do I get a birth registry extract? | ekstrakt-amze | 1 | yes | 0.171 |
| en | How do I register for health insurance? | sigurim-shendetesor | 1 | yes | 0.275 |
| en | How do I apply for a diplomatic visa? | aplikim-vize | 1 | yes | 0.244 |
| en | Where do I get my personal identification number? | numri-personal | 1 | yes | 0.229 |
| sr | Koliko košta pasoš? | pasaporta | 1 | yes | 0.159 |
| sr | Kako da dobijem vozačku dozvolu? | patente-shoferi | 1 | yes | 0.245 |
| sr | Kako da registrujem firmu? | regjistrim-biznesi | 2 | yes | 0.328 |
| sq | Ku mund të blej bileta për ndeshjen e futbollit? | (off-topic) | – | no | 0.405 |
| en | What is the best restaurant in Prizren? | (off-topic) | – | no | 0.384 |
| sq | Si ta gatuaj flijen? | (off-topic) | – | no | 0.440 |
| en | Who won the 2022 World Cup? | (off-topic) | – | no | 0.493 |
