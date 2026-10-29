"""
generate_data.py — Generate 1500 realistic fictional OPD notes for an Indian district hospital.
Categories:
  - Lab Review
  - Medication Titration
  - Surgical Dressing
  - General Follow-Up
Languages:
  - English, Hindi (Devanagari), Hinglish
Includes various follow-up pattern types and noisy cases.
"""

import csv
import random

random.seed(42)

CATEGORIES = [
    "Lab Review",
    "Medication Titration",
    "Surgical Dressing",
    "General Follow-Up",
]

# Building blocks for Lab Review
LAB_TEMPLATES_EN = [
    ("Repeat CBC, LFT, KFT after {interval}. Review with reports.", "yes"),
    ("Review blood test reports {interval}. Fasting sugar pending.", "yes"),
    ("Urine routine & microscopy sent. Follow up in {interval}.", "yes"),
    ("HbA1c and lipid profile advised. Come with report in {interval}.", "yes"),
    ("Thyroid panel (TSH/T3/T4) ordered. Review {interval}.", "yes"),
    ("Check serum creatinine and urea. Return after {interval} with results.", "yes"),
    ("Sputum for AFB sent. Collect report and show after {interval}.", "yes"),
    ("USG abdomen advised. Review after {interval} with sonography report.", "yes"),
    ("X-ray chest PA view done. Review in {interval} with film.", "yes"),
    ("Blood sugar fasting and PP to be done. Show reports after {interval}.", "yes"),
    ("CBC reports reviewed. Mild anaemia. Recheck Hb in {interval}.", "yes"),
    ("Platelet count low. Repeat test tomorrow morning and review.", "yes"),
    ("Blood reports pending. Show as soon as available.", "yes"),
    ("If reports show infection, review immediately.", "yes"),
    ("Labs normal, no further testing needed.", "no"),
    ("All baseline investigations satisfactory. Continue same rx.", "no"),
]

LAB_TEMPLATES_HI = [
    ("खून की जांच (CBC, LFT) करवाएं। {interval_hi} बाद रिपोर्ट दिखाएं।", "yes"),
    ("शुगर की जांच (Fasting/PP) कराकर {interval_hi} बाद रिपोर्ट लेकर आएं।", "yes"),
    ("पेशाब की जांच की रिपोर्ट {interval_hi} बाद दिखाएं।", "yes"),
    ("थायरॉइड की जांच कराएं, {interval_hi} बाद रिपोर्ट के साथ मिलें।", "yes"),
    ("अल्ट्रासाउंड (USG) रिपोर्ट आने पर {interval_hi} बाद दिखाएं।", "yes"),
    ("छाती का एक्स-रे करवा कर {interval_hi} में दिखाएं।", "yes"),
    ("खून की रिपोर्ट नॉर्मल है। 1 महीने बाद दोबारा रूटीन जांच कराएं।", "yes"),
    ("जांच रिपोर्ट आते ही तुरंत दिखाएं।", "yes"),
    ("यदि खून की जांच में प्लेटलेट्स कम हों तो तुरंत आएं।", "yes"),
    ("सभी जांच रिपोर्ट सामान्य हैं, अब जांच की जरूरत नहीं।", "no"),
]

LAB_TEMPLATES_HING = [
    ("Blood test (CBC/KFT) karwa lena, reports ke sath {interval_hing} baad dikhana.", "yes"),
    ("Sugar test fasting and PP karwao, report lekar {interval_hing} baad aana.", "yes"),
    ("Thyroid report aane par {interval_hing} me review karein.", "yes"),
    ("Urine culture report {interval_hing} me aayegi, tab dikha dena.", "yes"),
    ("HbA1c test karwana hai, {interval_hing} me report ke sath milna.", "yes"),
    ("Sonography karwa ke report ke sath {interval_hing} me aao.", "yes"),
    ("Creatinine aur urea test repeat karna hai after {interval_hing}.", "yes"),
    ("Reports aate hi dikha dena.", "yes"),
    ("Agar test me infection aaye to turant aana.", "yes"),
    ("Reports normal hain, abhi test repeat nahi karna.", "no"),
]

# Building blocks for Medication Titration
MED_TEMPLATES_EN = [
    ("Tab Amlodipine increased to 10mg OD. BP check and review after {interval}.", "yes"),
    ("Tab Metformin 500mg BD started. Monitor FBS, review in {interval}.", "yes"),
    ("Insulin dose adjusted to 14 units SC before dinner. Review after {interval}.", "yes"),
    ("Tab Telmisartan 40mg changed to 80mg. Check BP after {interval}.", "yes"),
    ("Tab Atorvastatin dose increased. Re-evaluate lipid levels in {interval}.", "yes"),
    ("Inhaler Budecort 200mcg puff twice daily. Assess asthma control in {interval}.", "yes"),
    ("Tab Thyronorm dose hiked to 75mcg. Repeat TSH & review in {interval}.", "yes"),
    ("Antihypertensive dosage titrated. Come for BP check after {interval}.", "yes"),
    ("Tapering prednisolone: 10mg for 5 days then 5mg. Review in {interval}.", "yes"),
    ("Tab Pantocid 40mg added. Adjust dose if symptoms persist after {interval}.", "yes"),
    ("Dose adjusted today. Review soon if any giddiness or side effects.", "yes"),
    ("If BP remains > 150/90, increase dose and report back.", "yes"),
    ("Medication titrated as discussed. No follow-up needed if stable.", "no"),
    ("Dose well tolerated. Continue current prescription.", "no"),
]

MED_TEMPLATES_HI = [
    ("बीपी की दवा (Amlodipine) की खुराक बढ़ा दी है। {interval_hi} बाद बीपी जांच कराएं।", "yes"),
    ("शुगर की दवा की खुराक बदली है। {interval_hi} बाद शुगर नाप कर दिखाएं।", "yes"),
    ("इंसुलिन की मात्रा 12 यूनिट की गई। {interval_hi} बाद आकर मिलें।", "yes"),
    ("थायरॉइड की गोली 50mcg से 75mcg की। {interval_hi} बाद जांच और फॉलो-अप।", "yes"),
    ("दवा की खुराक में बदलाव किया गया है। {interval_hi} बाद पुनरावलोकन करें।", "yes"),
    ("दवा कम की जा रही है, {interval_hi} बाद आकर दिखाएं।", "yes"),
    ("अगर दवा से चक्कर आए तो तुरंत आएं।", "yes"),
    ("दवा सही असर कर रही है, खुराक जारी रखें।", "no"),
    ("बीपी कंट्रोल में है, दवा की खुराक यथावत रहेगी।", "no"),
]

MED_TEMPLATES_HING = [
    ("BP ki goli dose badha di hai, {interval_hing} baad BP check karwane aana.", "yes"),
    ("Sugar medicine dose adjust ki hai, {interval_hing} baad fasting sugar check karayein.", "yes"),
    ("Insulin units badhayi hain, sugar chart ke sath {interval_hing} me dikhana.", "yes"),
    ("Medicine titration done. Check response in {interval_hing}.", "yes"),
    ("Steroid dose taper kar rahe hain, {interval_hing} me review karein.", "yes"),
    ("Dose change kiya hai, agar weakness lage to turant contact karein.", "yes"),
    ("Medicines theek chal rahi hain, continue karein.", "no"),
    ("Dose stable hai, koi change ki zaroorat nahi.", "no"),
]

# Building blocks for Surgical Dressing
SURG_TEMPLATES_EN = [
    ("Wound dressing change after {interval}. Keep area dry and clean.", "yes"),
    ("Suture removal (stitches out) scheduled after {interval}.", "yes"),
    ("Post-op wound healthy. Clean dressing in {interval}.", "yes"),
    ("Burn dressing done. Review in OPD after {interval} for fresh dressing.", "yes"),
    ("Abscess drained, sterile dressing done. Change dressing in {interval}.", "yes"),
    ("Staples removal due after {interval}. Inspect incision site.", "yes"),
    ("Pus discharge reduced. Suture line review in {interval}.", "yes"),
    ("Deep laceration sutured. Review after {interval} for suture inspection.", "yes"),
    ("Daily sterile dressing advised. Review in OPD after {interval}.", "yes"),
    ("Wound healing well. Remove stitches in {interval}.", "yes"),
    ("Come for dressing if bandage becomes soaked or foul smelling.", "yes"),
    ("Dressing review soon, avoid soaking in water.", "yes"),
    ("Wound completely healed, sutures removed, no further dressing required.", "no"),
    ("Skin healed well. Clean with soap water, dressing discontinued.", "no"),
]

SURG_TEMPLATES_HI = [
    ("घाव की पट्टी {interval_hi} बाद बदलवाने आएं। पट्टी को सूखा रखें।", "yes"),
    ("टांके {interval_hi} बाद कटवाने अस्पताल आएं।", "yes"),
    ("सर्जरी के बाद का घाव ठीक हो रहा है। {interval_hi} बाद ड्रेसिंग कराएं।", "yes"),
    ("जले का घाव है, {interval_hi} बाद नई पट्टी करवाने आएं।", "yes"),
    ("घाव साफ है, {interval_hi} बाद टांके चेक करवाएं।", "yes"),
    ("पट्टी रोज बदलें, {interval_hi} बाद डॉक्टर को दिखाएं।", "yes"),
    ("यदि घाव से मवाद या खून निकले तो तुरंत आएं।", "yes"),
    ("घाव पूरी तरह सूख चुका है, टांके कट चुके हैं। अब ड्रेसिंग की जरूरत नहीं।", "no"),
    ("घाव ठीक हो गया है, पट्टी हटा दी गई है।", "no"),
]

SURG_TEMPLATES_HING = [
    ("Ghav ki patti {interval_hing} baad change karwane aana. Paani mat lagne dena.", "yes"),
    ("Tanke cutwane ke liye {interval_hing} baad surgery OPD me aana.", "yes"),
    ("Wound dressing {interval_hing} me repeat karein. Swelling check karni hai.", "yes"),
    ("Stitches dry hain, {interval_hing} baad removal hoga.", "yes"),
    ("Sterile dressing kar di hai, {interval_hing} me fresh dressing karwayen.", "yes"),
    ("Agar bandage geeli ho jaye ya dard badhe to turant aana.", "yes"),
    ("Patti utaar di hai, ghav poora bhar gaya hai.", "no"),
    ("Stitches cut chuke hain, healing complete hai.", "no"),
]

# Building blocks for General Follow-Up
GEN_TEMPLATES_EN = [
    ("General follow up after {interval}. Review symptoms and progress.", "yes"),
    ("Review in OPD after {interval} if not fully relieved.", "yes"),
    ("Continue current treatment. Routine visit in {interval}.", "yes"),
    ("Follow up after {interval} to monitor overall recovery.", "yes"),
    ("Chest congestion improved. Re-consult after {interval} if cough continues.", "yes"),
    ("Joint pain persisting. Clinical re-assessment after {interval}.", "yes"),
    ("Child active, appetite improved. Routine paediatric check in {interval}.", "yes"),
    ("Review after {interval} for routine consultation.", "yes"),
    ("Come back if fever or abdominal pain recurs.", "yes"),
    ("Review soon or if symptoms worsen.", "yes"),
    ("Routine review after festivals or next month.", "yes"),
    ("Patient symptom free. Advice given. Discharge on SOS basis.", "no"),
    ("Condition stable. Continue lifestyle modifications, no fixed review.", "no"),
    ("Cured. No further visit required.", "no"),
]

GEN_TEMPLATES_HI = [
    ("सामान्य जांच के लिए {interval_hi} बाद दोबारा दिखाएं।", "yes"),
    ("तबीयत में सुधार है। {interval_hi} बाद रूटीन चेकअप के लिए आएं।", "yes"),
    ("दवाइयां जारी रखें, {interval_hi} बाद आकर मिलें।", "yes"),
    ("खांसी और जुकाम में आराम है, {interval_hi} बाद फॉलो-अप करें।", "yes"),
    ("कमजोरी और भूख न लगने की समीक्षा {interval_hi} बाद की जाएगी।", "yes"),
    ("अगर बुखार या पेट दर्द दोबारा हो तो तुरंत अस्पताल आएं।", "yes"),
    ("मरीज पूरी तरह स्वस्थ है, आगे दिखाने की आवश्यकता नहीं है।", "no"),
    ("अब कोई परेशानी नहीं है, फॉलो-अप समाप्त।", "no"),
]

GEN_TEMPLATES_HING = [
    ("Sab theek chal raha hai, general checkup ke liye {interval_hing} me aana.", "yes"),
    ("Aaram mil raha hai, regular follow-up {interval_hing} baad karein.", "yes"),
    ("Medicines continue rakhein aur {interval_hing} me OPD me dikha dein.", "yes"),
    ("Recovery achhi hai, {interval_hing} baad ek baar review karwa lena.", "yes"),
    ("Agar tabiyat thodi bhi kharab lage to bina der kiye aana.", "yes"),
    ("Abhi sab control me hai, jab zaroorat lage tabhi aana.", "no"),
    ("Condition bilkul normal hai, follow up zaroori nahi.", "no"),
]

# Intervals in EN, HI, HING
INTERVALS_EN = [
    "3 days", "5 days", "1 week", "7 days", "10 days", "2 weeks", "14 days",
    "3 weeks", "1 month", "4 weeks", "6 weeks", "2 months", "tomorrow", "next week"
]
INTERVALS_HI = [
    "३ दिन", "५ दिन", "एक हफ्ते", "७ दिन", "१० दिन", "दो हफ्ते", "१४ दिन",
    "तीन हफ्ते", "१ महीने", "चार हफ्ते", "६ हफ्ते", "दो महीने", "कल", "अगले हफ्ते"
]
INTERVALS_HING = [
    "3 din", "5 din", "1 week", "7 din", "10 din", "2 hafte", "14 din",
    "3 hafte", "1 mahine", "4 hafte", "6 hafte", "2 mahine", "kal", "agale hafte"
]

# Noisy / typo variants to simulate real OPD handwriting & typing noise
NOISE_PREFIXES = ["", "", "", "Pt: ", "R/o ", "Adv: ", "Imp: ", "K/C/O HTN, ", "Known diabetic, ", "OPD Slip: "]
NOISE_SUFFIXES = ["", "", "", " SOS", " pls", " strictly", " review with slip", " empty stomach", " post meal"]

rows = []

# Target: 1500 rows total (approx 375 per category)
for cat in CATEGORIES:
    if cat == "Lab Review":
        temps_en, temps_hi, temps_hing = LAB_TEMPLATES_EN, LAB_TEMPLATES_HI, LAB_TEMPLATES_HING
    elif cat == "Medication Titration":
        temps_en, temps_hi, temps_hing = MED_TEMPLATES_EN, MED_TEMPLATES_HI, MED_TEMPLATES_HING
    elif cat == "Surgical Dressing":
        temps_en, temps_hi, temps_hing = SURG_TEMPLATES_EN, SURG_TEMPLATES_HI, SURG_TEMPLATES_HING
    else:
        temps_en, temps_hi, temps_hing = GEN_TEMPLATES_EN, GEN_TEMPLATES_HI, GEN_TEMPLATES_HING

    # Generate 375 rows for this category
    for i in range(375):
        lang_choice = random.random()
        prefix = random.choice(NOISE_PREFIXES)
        suffix = random.choice(NOISE_SUFFIXES)

        if lang_choice < 0.40:
            # English
            template, has_fu = random.choice(temps_en)
            interval = random.choice(INTERVALS_EN)
            text = template.replace("{interval}", interval)
        elif lang_choice < 0.70:
            # Hindi
            template, has_fu = random.choice(temps_hi)
            interval = random.choice(INTERVALS_HI)
            text = template.replace("{interval_hi}", interval)
        else:
            # Hinglish
            template, has_fu = random.choice(temps_hing)
            interval = random.choice(INTERVALS_HING)
            text = template.replace("{interval_hing}", interval)

        # Light noise injection
        full_text = f"{prefix}{text}{suffix}".strip()
        rows.append({
            "note_text": full_text,
            "reason_category": cat,
            "has_followup": has_fu,
        })

# Shuffle to mix categories and languages
random.shuffle(rows)

out_path = "data/ml/adaption_notes.csv"
with open(out_path, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["note_text", "reason_category", "has_followup"])
    writer.writeheader()
    writer.writerows(rows)

print(f"Successfully generated {len(rows)} rows in {out_path}")
