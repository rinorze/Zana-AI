"""Builds 10 additional service catalogue entries and appends them to
data/seed_services.json (idempotent — won't add duplicates).

Run from the backend/ directory:
    python -m data.additional_services
"""
from __future__ import annotations

import json
from pathlib import Path


def _step(order: int, title_sq: str, title_en: str, title_sr: str, desc_sq: str, desc_en: str, desc_sr: str, items: list[str]) -> dict:
    return {
        "order": order,
        "titles": {"sq": title_sq, "en": title_en, "sr": title_sr},
        "descriptions": {"sq": desc_sq, "en": desc_en, "sr": desc_sr},
        "required_items": items,
    }


def _faq(q_sq: str, q_en: str, q_sr: str, a_sq: str, a_en: str, a_sr: str) -> dict:
    return {
        "questions": {"sq": q_sq, "en": q_en, "sr": q_sr},
        "answers": {"sq": a_sq, "en": a_en, "sr": a_sr},
    }


def _service(**kwargs) -> dict:
    kwargs.setdefault("last_verified", "2026-05-22")
    kwargs.setdefault("response_templates", [])
    return kwargs


ADDITIONS: list[dict] = [
    _service(
        service_id="numri-fiskal",
        category="Tatime",
        names={"sq": "Numri Fiskal", "en": "Fiscal Number (TIN)", "sr": "Fiskalni broj"},
        description={
            "sq": "Numri Fiskal është identifikues unik për personat fizikë dhe juridikë në regjistrin e tatimpaguesve të ATK-së. Lëshohet nga Administrata Tatimore e Kosovës.",
            "en": "The Fiscal Number is a unique taxpayer identifier issued by the Tax Administration of Kosovo (ATK) for individuals and legal entities.",
            "sr": "Fiskalni broj je jedinstveni identifikator poreskih obveznika koji izdaje Poreska uprava Kosova (ATK).",
        },
        fee="Pa pagesë",
        duration="1–3 ditë pune",
        office="Administrata Tatimore e Kosovës (ATK)",
        office_locations=[
            {"city": "Prishtinë", "address": "Sheshi 'Bill Klinton', Pallati i ATK-së", "hours": "08:00–16:00 (E hënë–E premte)"},
            {"city": "Mitrovicë", "address": "Rruga Trepça, p.n.", "hours": "08:00–15:30 (E hënë–E premte)"},
        ],
        required_documents=[
            "Letërnjoftim valid",
            "Çertifikatë lindjeje ose Çertifikatë e biznesit (për kompani)",
            "Formulari i aplikimit (ATK-001)",
        ],
        steps=[
            _step(1, "Plotëso formularin", "Fill in the form", "Popunite obrazac",
                  "Shkarko formularin ATK-001 nga atk-ks.org ose merre në sportel.",
                  "Download form ATK-001 from atk-ks.org or pick it up at the counter.",
                  "Preuzmite obrazac ATK-001 sa atk-ks.org ili u kancelariji.",
                  ["Formulari ATK-001"]),
            _step(2, "Paraqitu në ATK", "Visit ATK office", "Posetite ATK",
                  "Dorëzo formularin së bashku me letërnjoftimin valid në çdo zyrë rajonale të ATK-së.",
                  "Submit the form together with a valid ID at any regional ATK office.",
                  "Predajte obrazac sa važećom ličnom kartom u bilo kojoj regionalnoj ATK kancelariji.",
                  ["Letërnjoftim valid"]),
            _step(3, "Merr numrin fiskal", "Receive the TIN", "Preuzmite TIN",
                  "Numri fiskal lëshohet menjëherë ose brenda 3 ditësh pune dhe shfaqet në llogarinë EDI të ATK-së.",
                  "The TIN is issued immediately or within 3 business days and appears in your ATK EDI account.",
                  "TIN se izdaje odmah ili u roku od 3 radna dana i pojavljuje se u ATK EDI nalogu.",
                  []),
        ],
        faqs=[
            _faq("A duhet numër fiskal për punësim?",
                 "Do I need a fiscal number to be employed?",
                 "Da li mi treba fiskalni broj za zaposlenje?",
                 "Po. Punëdhënësi duhet ta deklarojë numrin tuaj fiskal për kontributet pensionale dhe tatimore.",
                 "Yes. Your employer must declare your TIN for pension and tax contributions.",
                 "Da. Poslodavac mora da prijavi vaš TIN za penzijske i poreske doprinose."),
        ],
        source_urls=[
            "https://www.atk-ks.org/sherbimet/numri-fiskal/",
            "https://ekosova.rks-gov.net/sherbimet/numri-fiskal",
        ],
    ),
    _service(
        service_id="regjistrim-tvsh",
        category="Tatime",
        names={"sq": "Regjistrimi për TVSH", "en": "VAT Registration", "sr": "Registracija za PDV"},
        description={
            "sq": "Subjektet që kalojnë qarkullimin vjetor 30,000 EUR duhet të regjistrohen për TVSH pranë ATK-së dhe të deklarojnë tatimin çdo muaj.",
            "en": "Businesses with annual turnover above EUR 30,000 must register for VAT with ATK and file monthly returns.",
            "sr": "Pravna lica sa godišnjim prometom preko 30.000 EUR moraju se registrovati za PDV pri ATK i mesečno podnositi prijave.",
        },
        fee="Pa pagesë",
        duration="1–2 ditë pune",
        office="Administrata Tatimore e Kosovës (ATK)",
        office_locations=[
            {"city": "Prishtinë", "address": "Sheshi 'Bill Klinton'", "hours": "08:00–16:00"},
        ],
        required_documents=[
            "Certifikata e biznesit (ARBK)",
            "Numri fiskal",
            "Pasqyra financiare të 12 muajve të fundit",
            "Letërnjoftim i pronarit / drejtorit ekzekutiv",
        ],
        steps=[
            _step(1, "Plotëso aplikacionin elektronik", "Fill electronic application", "Popunite elektronsku prijavu",
                  "Identifikohu në EDI të ATK-së dhe zgjedh 'Aplikim për TVSH'.",
                  "Log in to ATK EDI and choose 'VAT registration'.",
                  "Prijavite se na ATK EDI i izaberite 'Prijava PDV'.",
                  []),
            _step(2, "Ngarko dokumentet", "Upload supporting docs", "Otpremite dokumente",
                  "Bashkëngjit certifikatën e biznesit dhe pasqyrat financiare.",
                  "Attach the business certificate and financial statements.",
                  "Priložite sertifikat o registraciji i finansijske izveštaje.",
                  []),
            _step(3, "Prit konfirmimin", "Wait for confirmation", "Sačekajte potvrdu",
                  "ATK lëshon Certifikatën e TVSH-së brenda 2 ditësh pune.",
                  "ATK issues the VAT certificate within 2 business days.",
                  "ATK izdaje PDV sertifikat u roku od 2 radna dana.",
                  []),
        ],
        faqs=[
            _faq("A mund të aplikoj vullnetarisht për TVSH nën pragun?",
                 "Can I register for VAT voluntarily below the threshold?",
                 "Mogu li dobrovoljno da se registrujem za PDV?",
                 "Po — subjektet mund të kërkojnë regjistrim vullnetar nëse parashohin tejkalimin e pragut brenda 12 muajve.",
                 "Yes — businesses may apply voluntarily if they expect to exceed the threshold within 12 months.",
                 "Da — preduzeća mogu dobrovoljno da se registruju ako očekuju da pređu prag u 12 meseci."),
        ],
        source_urls=["https://www.atk-ks.org/sherbimet/regjistrimi-per-tvsh/"],
    ),
    _service(
        service_id="regjistrim-automjeti",
        category="Trafiku",
        names={"sq": "Regjistrimi i automjetit", "en": "Vehicle Registration", "sr": "Registracija vozila"},
        description={
            "sq": "Procedura për regjistrimin fillestar dhe ripërtëritjen e regjistrimit të automjeteve në Kosovë pranë Qendrës për Pajisje me Dokumente.",
            "en": "Initial registration and renewal of motor vehicles in Kosovo through the Document Issuance Centre.",
            "sr": "Postupak prve registracije i obnove registracije motornih vozila na Kosovu preko Centra za izdavanje dokumenata.",
        },
        fee="Tarifa ndryshon sipas kubikazhit (50–250 EUR)",
        duration="1 ditë (brenda të njëjtës ditë në shumicën e rasteve)",
        office="Qendrat për Pajisje me Dokumente — MPB",
        office_locations=[
            {"city": "Prishtinë", "address": "Aktash, Magjistralja Prishtinë–Mitrovicë", "hours": "08:00–16:00"},
            {"city": "Pejë", "address": "Rruga Lidhja e Pejës", "hours": "08:00–15:30"},
        ],
        required_documents=[
            "Letërnjoftim valid",
            "Libreza e automjetit ose Fatura e blerjes",
            "Polica e sigurimit (TPL)",
            "Kontrolli teknik valid",
            "Fletë-pagesa e taksës së regjistrimit",
        ],
        steps=[
            _step(1, "Inspektim teknik", "Technical inspection", "Tehnički pregled",
                  "Kryeni kontrollin teknik vjetor në një ndër qendrat e licencuara nga MI.",
                  "Complete the annual technical inspection at a MoI-licensed centre.",
                  "Obavite godišnji tehnički pregled u licenciranom centru MI.",
                  []),
            _step(2, "Sigurim TPL", "Compulsory insurance", "Obavezno osiguranje",
                  "Lidh policën e detyrueshme TPL me një kompani sigurimi.",
                  "Buy the compulsory TPL insurance from an insurer.",
                  "Kupite obavezno TPL osiguranje od osiguravajuće kompanije.",
                  []),
            _step(3, "Paguaj taksën", "Pay the fee", "Platite taksu",
                  "Paguaj taksën sipas kubikazhit në bankë ose përmes eKosova.",
                  "Pay the registration fee at a bank or via eKosova.",
                  "Platite taksu u banci ili preko eKosova.",
                  []),
            _step(4, "Paraqitu në CPD", "Visit the CPD", "Idite u CPD",
                  "Dorëzo dokumentet dhe merr targat / librezën e re.",
                  "Submit the documents and receive new plates / registration book.",
                  "Predajte dokumente i preuzmite tablice / saobraćajnu.",
                  []),
        ],
        faqs=[
            _faq("Sa zgjat regjistrimi i automjetit?",
                 "How long is a vehicle registration valid?",
                 "Koliko važi registracija vozila?",
                 "Regjistrimi është vjetor — ripërtëritet çdo 12 muaj.",
                 "Registration lasts 12 months and must be renewed annually.",
                 "Registracija važi 12 meseci i obnavlja se godišnje."),
        ],
        source_urls=["https://mpb.rks-gov.net/sherbimet/regjistrimi-i-automjetit"],
    ),
    _service(
        service_id="certifikate-padenimi",
        category="Dokumente Civile",
        names={"sq": "Çertifikatë e padënimit", "en": "Criminal Record Certificate", "sr": "Uverenje o nekažnjavanju"},
        description={
            "sq": "Çertifikata e padënimit konfirmon se nuk ekzistojnë vendime gjyqësore aktive ndaj qytetarit. Lëshohet nga Gjykata Themelore.",
            "en": "The criminal record certificate confirms there are no active court judgements against the citizen. Issued by the Basic Court.",
            "sr": "Uverenje o nekažnjavanju potvrđuje da ne postoje aktivne sudske odluke protiv građanina. Izdaje Osnovni sud.",
        },
        fee="2 EUR",
        duration="Brenda ditës — 3 ditë pune",
        office="Gjykata Themelore — Departamenti i Përgjithshëm",
        office_locations=[
            {"city": "Prishtinë", "address": "Pallati i Drejtësisë, rr. Luan Haradinaj", "hours": "08:00–15:00"},
        ],
        required_documents=["Letërnjoftim valid", "Fletë-pagesa (2 EUR)"],
        steps=[
            _step(1, "Aplikim", "Application", "Prijava",
                  "Plotëso kërkesën në sportelin e Gjykatës ose përmes eKosova.",
                  "Submit the request at the court counter or via eKosova.",
                  "Predajte zahtev na šalteru suda ili preko eKosova.",
                  []),
            _step(2, "Pagesa", "Payment", "Plaćanje",
                  "Paguaj taksën 2 EUR në bankën e licencuar.",
                  "Pay the 2 EUR fee at a licensed bank.",
                  "Platite 2 EUR taksu u licenciranoj banci.",
                  []),
            _step(3, "Merr çertifikatën", "Pick up the certificate", "Preuzmite uverenje",
                  "Çertifikata tërhiqet personalisht ose dërgohet me email përmes eKosova.",
                  "Collect the certificate in person or receive it by email via eKosova.",
                  "Uverenje se podiže lično ili dolazi mejlom preko eKosova.",
                  []),
        ],
        faqs=[
            _faq("Sa kohë vlen çertifikata?",
                 "How long is the certificate valid?",
                 "Koliko važi uverenje?",
                 "Çertifikata zakonisht pranohet deri në 6 muaj nga data e lëshimit.",
                 "The certificate is usually accepted for up to 6 months from issue.",
                 "Uverenje se obično prihvata do 6 meseci od izdavanja."),
        ],
        source_urls=["https://ekosova.rks-gov.net/sherbimet/certifikate-padenimi"],
    ),
    _service(
        service_id="ekstrakti-pronesise",
        category="Pronë",
        names={"sq": "Ekstrakti i pronësisë", "en": "Property Ownership Extract", "sr": "Izvod o vlasništvu"},
        description={
            "sq": "Ekstrakti i pronësisë është dokument zyrtar që dëshmon të drejtën e pronësisë mbi një ngastër kadastrale. Lëshohet nga Agjencia Kadastrale e Kosovës.",
            "en": "The ownership extract is an official document proving the right of ownership over a cadastral parcel. Issued by the Kosovo Cadastral Agency.",
            "sr": "Izvod o vlasništvu je zvanični dokument koji dokazuje pravo vlasništva nad katastarskom parcelom. Izdaje Katastarska agencija Kosova.",
        },
        fee="3 EUR (kopje fizike) / 1 EUR (kopje elektronike)",
        duration="Brenda ditës",
        office="Agjencia Kadastrale e Kosovës (AKK) — Komuna",
        office_locations=[
            {"city": "Prishtinë", "address": "Komuna e Prishtinës, Drejtoria e Kadastrit", "hours": "08:00–15:30"},
        ],
        required_documents=["Letërnjoftim valid", "Numri i parcelës ose adresa e pronës", "Fletë-pagesa"],
        steps=[
            _step(1, "Identifikoni pronën", "Identify the property", "Identifikujte nekretninu",
                  "Gjej numrin e parcelës dhe zonën kadastrale në sistemin online geoportal.rks-gov.net.",
                  "Find the parcel number and cadastral zone via geoportal.rks-gov.net.",
                  "Pronađite broj parcele i katastarsku zonu preko geoportal.rks-gov.net.",
                  []),
            _step(2, "Aplikimi", "Application", "Prijava",
                  "Aplikoni në sportelin e kadastrit komunal ose përmes eKosova.",
                  "Apply at the municipal cadastre desk or via eKosova.",
                  "Prijavite se na opštinskom katastru ili preko eKosova.",
                  []),
            _step(3, "Pagesa & marrja", "Payment & pickup", "Plaćanje i preuzimanje",
                  "Pas pagesës, ekstrakti lëshohet brenda 30 minutash.",
                  "After payment the extract is issued within 30 minutes.",
                  "Posle uplate izvod se izdaje za 30 minuta.",
                  []),
        ],
        faqs=[
            _faq("A mund të lëshohet ekstrakti elektronik?",
                 "Can an electronic extract be issued?",
                 "Da li može elektronski izvod?",
                 "Po. Përmes eKosova merrni një PDF të nënshkruar dixhitalisht.",
                 "Yes. Via eKosova you receive a digitally signed PDF.",
                 "Da. Preko eKosova dobijate digitalno potpisan PDF."),
        ],
        source_urls=["https://www.kca-ks.org/sherbime/ekstrakti-i-pronesise"],
    ),
    _service(
        service_id="sigurim-shendetesor",
        category="Shëndetësia",
        names={"sq": "Sigurimi shëndetësor", "en": "Health Insurance", "sr": "Zdravstveno osiguranje"},
        description={
            "sq": "Sigurimi shëndetësor u garanton qytetarëve qasje në kujdesin publik shëndetësor. Aplikimi bëhet pranë Fondit të Sigurimit Shëndetësor.",
            "en": "Health insurance grants citizens access to public healthcare services. Applications are submitted to the Health Insurance Fund.",
            "sr": "Zdravstveno osiguranje obezbeđuje pristup javnim zdravstvenim uslugama. Prijave se podnose Fondu zdravstvenog osiguranja.",
        },
        fee="Premia varion (3–7% e të ardhurave bruto)",
        duration="Aktiv brenda 5 ditësh pune",
        office="Fondi i Sigurimit Shëndetësor (FSSH)",
        office_locations=[
            {"city": "Prishtinë", "address": "Rruga 'Zenel Salihu', p.n.", "hours": "08:00–16:00"},
        ],
        required_documents=[
            "Letërnjoftim valid",
            "Çertifikatë lindjeje",
            "Kontratë pune ose dëshmi vetëpunësimi",
            "Numri fiskal",
        ],
        steps=[
            _step(1, "Aplikim online", "Online application", "Onlajn prijava",
                  "Hyni në fssh.rks-gov.net dhe plotësoni formularin elektronik.",
                  "Sign in to fssh.rks-gov.net and fill the electronic form.",
                  "Prijavite se na fssh.rks-gov.net i popunite obrazac.",
                  []),
            _step(2, "Pagesa e premies", "Pay the premium", "Plaćanje premije",
                  "Pagesa bëhet mujore përmes bankës ose ndalesa në pagë.",
                  "Premium is paid monthly via bank or salary deduction.",
                  "Premija se plaća mesečno preko banke ili obustave na zaradi.",
                  []),
            _step(3, "Aktivizimi i kartelës", "Card activation", "Aktivacija kartice",
                  "Kartela e sigurimit aktivizohet brenda 5 ditësh pas pagesës së parë.",
                  "The insurance card is activated within 5 days of the first payment.",
                  "Kartica se aktivira u roku od 5 dana posle prve uplate.",
                  []),
        ],
        faqs=[
            _faq("A janë studentët të mbuluar?",
                 "Are students covered?",
                 "Da li su studenti pokriveni?",
                 "Po, studentët deri në 26 vjeç me status aktiv mund të mbulohen nga prindi i siguruar.",
                 "Yes — students up to 26 with active status may be covered through an insured parent.",
                 "Da — studenti do 26 godina mogu biti pokriveni preko osiguranog roditelja."),
        ],
        source_urls=["https://fssh.rks-gov.net/sherbimet/aplikim"],
    ),
    _service(
        service_id="legalizim-diplome",
        category="Arsim",
        names={"sq": "Legalizimi i diplomës", "en": "Diploma Legalisation", "sr": "Legalizacija diplome"},
        description={
            "sq": "Procedura për legalizimin e diplomave të lëshuara nga institucionet kosovare, për përdorim jashtë vendit. Kryhet nga MASHTI.",
            "en": "Legalisation of diplomas issued by Kosovo institutions for use abroad. Handled by MEST.",
            "sr": "Postupak legalizacije diploma izdatih u kosovskim institucijama, za upotrebu u inostranstvu. Sprovodi MONT.",
        },
        fee="10 EUR",
        duration="5 ditë pune",
        office="Ministria e Arsimit (MASHTI) — Departamenti i Diplomave",
        office_locations=[
            {"city": "Prishtinë", "address": "Rruga 'Agim Ramadani', p.n.", "hours": "09:00–15:00"},
        ],
        required_documents=[
            "Diploma origjinale + kopje",
            "Çertifikata e notave",
            "Letërnjoftim valid",
            "Fletë-pagesa",
        ],
        steps=[
            _step(1, "Apliko në MASHTI", "Apply at MEST", "Prijava u MONT",
                  "Dorëzo dokumentet në sportelin e MASHTI-it ose përmes eKosova.",
                  "Submit the documents at the MEST counter or via eKosova.",
                  "Predajte dokumente u MONT-u ili preko eKosova.",
                  []),
            _step(2, "Verifikim", "Verification", "Verifikacija",
                  "MASHTI verifikon autenticitetin me universitetin lëshues.",
                  "MEST verifies authenticity with the issuing university.",
                  "MONT proverava autentičnost sa univerzitetom.",
                  []),
            _step(3, "Vula apostille", "Apostille stamp", "Apostille pečat",
                  "Diploma vuloset me Apostille të Hagës dhe lëshohet brenda 5 ditësh.",
                  "The diploma is stamped with Hague Apostille and issued within 5 days.",
                  "Diploma se overava Haškom apostilom u roku od 5 dana.",
                  []),
        ],
        faqs=[
            _faq("A nevojitet përkthim?",
                 "Is translation required?",
                 "Da li je potreban prevod?",
                 "Përkthimi zyrtar kërkohet vetëm nga vendi pranues. Apostille është neutral.",
                 "Official translation is required only by the receiving country. Apostille is language-neutral.",
                 "Zvanični prevod traži samo zemlja prijema. Apostil je jezički neutralan."),
        ],
        source_urls=["https://masht.rks-gov.net/sherbimet/legalizim-diplome"],
    ),
    _service(
        service_id="aplikim-vize",
        category="Punët e Jashtme",
        names={"sq": "Aplikim për vizë diplomatike", "en": "Diplomatic Visa Application", "sr": "Prijava za diplomatsku vizu"},
        description={
            "sq": "Aplikim për vizë diplomatike ose zyrtare të Republikës së Kosovës. Procedura administrohet nga Ministria e Punëve të Jashtme.",
            "en": "Application for a diplomatic or official visa of the Republic of Kosovo. Handled by the Ministry of Foreign Affairs.",
            "sr": "Prijava za diplomatsku ili službenu vizu Republike Kosovo. Sprovodi Ministarstvo spoljnih poslova.",
        },
        fee="60 EUR (vizë e thjeshtë) / 100 EUR (vizë me hyrje të shumëfishta)",
        duration="10–15 ditë pune",
        office="Ministria e Punëve të Jashtme (MPJ)",
        office_locations=[
            {"city": "Prishtinë", "address": "Rruga 'Luan Haradinaj', Pallati i Qeverisë", "hours": "09:00–16:00"},
        ],
        required_documents=[
            "Pasaportë diplomatike / zyrtare valide",
            "Letër mision nga organizata",
            "Formulari i vizës",
            "Fotografi biometrike",
        ],
        steps=[
            _step(1, "Plotëso aplikimin", "Fill the application", "Popunite prijavu",
                  "Plotëso formularin online në mfa-ks.net dhe ngarko dokumentet.",
                  "Fill the online form on mfa-ks.net and upload documents.",
                  "Popunite onlajn obrazac na mfa-ks.net i otpremite dokumente.",
                  []),
            _step(2, "Intervistë (opsionale)", "Interview (optional)", "Intervju (opciono)",
                  "Në raste të caktuara kërkohet intervistë në ambasadën më të afërt.",
                  "An interview at the nearest embassy may be required in certain cases.",
                  "U određenim slučajevima potreban je intervju u najbližoj ambasadi.",
                  []),
            _step(3, "Lëshimi i vizës", "Visa issuance", "Izdavanje vize",
                  "Viza ngjitet në pasaportë brenda 10–15 ditësh nga aprovimi.",
                  "The visa is affixed to the passport within 10–15 days of approval.",
                  "Viza se lepi u pasoš za 10–15 dana od odobrenja.",
                  []),
        ],
        faqs=[],
        source_urls=["https://mfa-ks.net/sherbimet/vizat"],
    ),
    _service(
        service_id="pension-pleqerise",
        category="Mirëqenia Sociale",
        names={"sq": "Pensioni i pleqërisë", "en": "Old-Age Pension", "sr": "Starosna penzija"},
        description={
            "sq": "Pensioni i pleqërisë jepet nga MPMS për qytetarët mbi 65 vjeç. Aplikohet personalisht ose përmes eKosova-s.",
            "en": "Old-age pension is provided by the Ministry of Labour and Social Welfare for citizens over 65, applied for in person or via eKosova.",
            "sr": "Starosnu penziju isplaćuje MRSP građanima preko 65 godina, prijava se podnosi lično ili preko eKosova.",
        },
        fee="Pa pagesë",
        duration="60 ditë (vendim)",
        office="Ministria e Punës dhe Mirëqenies Sociale (MPMS)",
        office_locations=[
            {"city": "Prishtinë", "address": "Rruga 'UÇK', Pallati i MPMS-së", "hours": "08:00–16:00"},
        ],
        required_documents=[
            "Letërnjoftim valid",
            "Çertifikatë lindjeje (jo më e vjetër se 6 muaj)",
            "Numri i llogarisë bankare",
            "Çertifikatë vendbanimi",
        ],
        steps=[
            _step(1, "Aplikimi", "Application", "Prijava",
                  "Dorëzo dokumentet në qendrën rajonale të MPMS-së ose përmes eKosova.",
                  "Submit the documents at the regional MoLSW office or via eKosova.",
                  "Predajte dokumente u regionalnoj kancelariji MRSP ili preko eKosova.",
                  []),
            _step(2, "Vlerësimi", "Assessment", "Procena",
                  "MPMS vlerëson kriteret e moshës dhe vendbanimit brenda 60 ditësh.",
                  "MoLSW assesses age and residence criteria within 60 days.",
                  "MRSP procenjuje uslove starosti i prebivališta u roku od 60 dana.",
                  []),
            _step(3, "Pagesa mujore", "Monthly payment", "Mesečna isplata",
                  "Pensioni mujor depozitohet drejtpërdrejt në llogarinë bankare.",
                  "The monthly pension is deposited directly into the bank account.",
                  "Mesečna penzija se uplaćuje direktno na bankovni račun.",
                  []),
        ],
        faqs=[
            _faq("Sa është shuma e pensionit?",
                 "How much is the pension?",
                 "Kolika je penzija?",
                 "Shuma bazë është rreth 100 EUR/muaj; pensioni i kontributpaguesve është më i lartë.",
                 "The basic amount is about 100 EUR/month; contributor pension is higher.",
                 "Osnovni iznos je oko 100 EUR/mesec; doprinosna penzija je veća."),
        ],
        source_urls=["https://mpms.rks-gov.net/pensioni-pleqerise"],
    ),
    _service(
        service_id="numri-personal",
        category="Dokumente Civile",
        names={"sq": "Numri personal", "en": "Personal Identification Number", "sr": "Lični broj"},
        description={
            "sq": "Numri personal është identifikues unik 10-shifror i lëshuar nga Ministria e Punëve të Brendshme në momentin e regjistrimit civil të lindjes.",
            "en": "The Personal Identification Number is a unique 10-digit identifier issued by the Ministry of Internal Affairs at civil birth registration.",
            "sr": "Lični broj je jedinstveni desetocifreni identifikator koji izdaje Ministarstvo unutrašnjih poslova prilikom upisa rođenja.",
        },
        fee="Pa pagesë (në regjistrim fillestar)",
        duration="Menjëherë",
        office="Zyrat e Gjendjes Civile — Komuna",
        office_locations=[
            {"city": "Prishtinë", "address": "Komuna e Prishtinës, Zyra e Gjendjes Civile", "hours": "08:00–16:00"},
        ],
        required_documents=[
            "Çertifikatë lindjeje",
            "Letërnjoftim i prindit (për të miturit)",
        ],
        steps=[
            _step(1, "Lajmërimi i lindjes", "Birth notification", "Prijava rođenja",
                  "Spitali njofton zyrën e gjendjes civile brenda 30 ditësh nga lindja.",
                  "The hospital notifies civil registry within 30 days of birth.",
                  "Bolnica obaveštava matičnu službu u roku od 30 dana od rođenja.",
                  []),
            _step(2, "Lëshimi i numrit", "Issuance of the number", "Izdavanje broja",
                  "Numri personal lëshohet automatikisht me regjistrimin e lindjes.",
                  "The personal number is issued automatically upon birth registration.",
                  "Lični broj se izdaje automatski upisom rođenja.",
                  []),
        ],
        faqs=[
            _faq("Si mund ta gjej numrin tim personal?",
                 "How can I find my personal number?",
                 "Kako da nađem svoj lični broj?",
                 "Numri personal është i shtypur në letërnjoftim dhe pasaportë.",
                 "The personal number is printed on the ID card and passport.",
                 "Lični broj je odštampan na ličnoj karti i pasošu."),
        ],
        source_urls=["https://mpb.rks-gov.net/dokumente/numri-personal"],
    ),
]


def main() -> int:
    path = Path(__file__).resolve().parent / "seed_services.json"
    data = json.loads(path.read_text())
    existing_ids = {s["service_id"] for s in data}

    added = 0
    for entry in ADDITIONS:
        if entry["service_id"] in existing_ids:
            continue
        data.append(entry)
        added += 1

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"Added {added} new services. Total now: {len(data)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
