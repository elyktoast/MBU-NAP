/* Question data for the SRNA Equipment board review.
   Each question's image_id matches a key in images.js (window.QUIZ_IMAGES).
   Fields: id (stable), num, lec, lk, type (single|multi), n (picks), q (stem), c (choices), a (answer indexes),
   exp, disc (lecture discrepancy), supp (beyond the slide), image_id, ref (sources), concept. */
window.QUIZ_DATA = {
 "schema": 1,
 "title": "Equipment board review",
 "storage_key": "srna_board_review_v1",
 "count": 150,
 "questions": [
  {
   "id": "NC01",
   "num": 1,
   "lec": "CO2 & scavenging",
   "lk": "co2",
   "type": "single",
   "n": 1,
   "q": "During mechanical ventilation, waste gas leaves the breathing system through which lettered valve?",
   "c": [
    "Valve H",
    "Valve K",
    "Valve B",
    "Valve A"
   ],
   "a": [
    1
   ],
   "exp": "K is the ventilator relief (pressure relief) valve at the bellows. When the ventilator is in use, the APL (H) is out of circuit and waste gas leaves through the ventilator relief valve to the scavenger. A and B are the inspiratory and expiratory valves.",
   "disc": null,
   "supp": null,
   "ref": [
    "CO2 Absorbents and Scavenging (McPherson): slide 19 (PDF p. 10)"
   ],
   "concept": "Diagram: ventilator relief valve",
   "image_id": "img-co2-scavenging-circuit"
  },
  {
   "id": "NG35",
   "num": 2,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "To confirm how much N2O remains, a tech weighs the cylinder at 7.1 kg. Which cylinder marking is needed to interpret that number?",
   "c": [
    "The retest date",
    "The rated filling pressure",
    "The serial number",
    "The stamped tare (empty) weight"
   ],
   "a": [
    3
   ],
   "exp": "Because N2O pressure stays at 745 psig while liquid remains, contents are judged by weight: current weight minus the stamped tare weight equals the N2O left.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 9, 14 (PDF p. 5, 7)"
   ],
   "concept": "Tare weight use",
   "image_id": null
  },
  {
   "id": "NM01",
   "num": 3,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "multi",
   "n": 3,
   "q": "Ten minutes after intubation, the provider realizes the ventilator was never switched on. Which findings fit? Select 3.",
   "c": [
    "Shark-fin capnogram",
    "No chest rise",
    "SpO2 drifting down",
    "Bellows not cycling",
    "High peak pressure alarm",
    "Elevated inspired CO2 baseline"
   ],
   "a": [
    1,
    2,
    3
   ],
   "exp": "Failure to initiate ventilation is the most common hypercarbia cause: the patient isn't breathing, so there's no chest rise, the bellows are still, CO2 builds, and SpO2 eventually falls. High pressure, a raised baseline, and a shark fin describe obstruction, rebreathing, and bronchospasm.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slides 20, 23 (PDF p. 10, 12)"
   ],
   "concept": "Ventilator never started",
   "image_id": null
  },
  {
   "id": "NC10",
   "num": 4,
   "lec": "CO2 & scavenging",
   "lk": "co2",
   "type": "single",
   "n": 1,
   "q": "Why does lowering fresh gas flow reduce the environmental impact of a volatile anesthetic?",
   "c": [
    "It reduces compound A, which is a greenhouse gas",
    "It lowers the agent's atmospheric lifetime",
    "It converts agent into CO2",
    "Less agent is vented through the scavenger to the atmosphere"
   ],
   "a": [
    3
   ],
   "exp": "Scavenged agent is vented to the outside. Lower FGF means less fresh gas, and less agent, passes through the system per hour. Atmospheric lifetime is a property of the agent (sevo 1.1 yr, des 14 yr).",
   "disc": null,
   "supp": null,
   "ref": [
    "CO2 Absorbents and Scavenging (McPherson): slide 23 (PDF p. 12)"
   ],
   "concept": "Low flow and environment",
   "image_id": null
  },
  {
   "id": "NV04",
   "num": 5,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "A medical air E-cylinder (625 L at 1900 psig) reads 1400 psig. About how much air remains?",
   "c": [
    "About 230 L",
    "About 460 L",
    "About 625 L",
    "About 1,400 L"
   ],
   "a": [
    1
   ],
   "exp": "Compressed gas: 1400/1900 × 625 ≈ 460 L.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 7, 13 (PDF p. 4, 7)"
   ],
   "concept": "Air contents drill",
   "image_id": null
  },
  {
   "id": "NI08",
   "num": 6,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "single",
   "n": 1,
   "q": "During a power failure, a spontaneously breathing patient (MV 7 L/min) is placed on a Mapleson A running off a full O2 E-cylinder (about 660 L). About how long will the O2 last at the minimum recommended flow?",
   "c": [
    "About 47 minutes",
    "About 94 minutes",
    "About 135 minutes",
    "About 3.5 hours"
   ],
   "a": [
    2
   ],
   "exp": "Mapleson A needs FGF of at least 0.7 × MV = 4.9 L/min. 660 ÷ 4.9 ≈ 135 minutes. That's why Mapleson A is efficient for spontaneous breathing.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slides 21, 32 (PDF p. 11, 16)",
    "Medical Gas Systems in Anesthesia (Elmore): slide 13 (PDF p. 7)"
   ],
   "concept": "Mapleson A on a cylinder",
   "image_id": null
  },
  {
   "id": "NV15",
   "num": 7,
   "lec": "CO2 & scavenging",
   "lk": "co2",
   "type": "single",
   "n": 1,
   "q": "Without scavenging, room sevoflurane measures 15 ppm. About what level would a properly working system produce, and would it meet NIOSH (no N2O in use)?",
   "c": [
    "About 1.5 ppm; within the 2 ppm limit",
    "About 7.5 ppm; exceeds the limit",
    "About 1.5 ppm; exceeds the 0.5 ppm limit",
    "About 0.15 ppm; well within"
   ],
   "a": [
    0
   ],
   "exp": "Scavenging cuts trace levels about 90%: 15 → 1.5 ppm. With no N2O, the halogenated limit is 2 ppm, so it's within. The 0.5 ppm limit applies only when N2O is also used.",
   "disc": null,
   "supp": null,
   "ref": [
    "CO2 Absorbents and Scavenging (McPherson): slide 18 (PDF p. 9)"
   ],
   "concept": "Scavenging and limit drill",
   "image_id": null
  },
  {
   "id": "NA01",
   "num": 8,
   "lec": "Airway",
   "lk": "air",
   "type": "single",
   "n": 1,
   "q": "An oropharyngeal airway relieves obstruction mainly by lifting which labeled structure?",
   "c": [
    "Structure A",
    "Structure B",
    "Structure C",
    "Structure D"
   ],
   "a": [
    0
   ],
   "exp": "A is the tongue, the main source of obstruction along with the soft palate. The OPA's caudally facing concave curve lifts it off the posterior pharynx. B is the vallecula, C the epiglottis, D the glossoepiglottic ligament.",
   "disc": null,
   "supp": null,
   "ref": [
    "Airway Equipment (McPherson): slides 2, 5 (PDF p. 2, 5)"
   ],
   "concept": "Anatomy: OPA target",
   "image_id": "img-air-upper-airway"
  },
  {
   "id": "NG31",
   "num": 9,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "N2O is running and the provider turns the O2 flowmeter fully off. O2 supply pressure is normal. Which device prevents delivery of 100% N2O?",
   "c": [
    "The O2 supply alarm",
    "The fail-safe valve",
    "The second-stage regulator",
    "The proportioning system"
   ],
   "a": [
    3
   ],
   "exp": "The proportioning system links N2O flow to O2 flow at the flow control valves, so N2O falls as O2 is turned down. The fail-safe does nothing here because O2 supply pressure is normal.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 34, 45 (PDF p. 17, 23)"
   ],
   "concept": "Proportioner vs fail-safe",
   "image_id": null
  },
  {
   "id": "NV01",
   "num": 10,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "An O2 E-cylinder reads 1500 psig. About how long will it last at 6 L/min?",
   "c": [
    "About 43 minutes",
    "About 87 minutes",
    "About 110 minutes",
    "About 250 minutes"
   ],
   "a": [
    1
   ],
   "exp": "1500/1900 × 660 ≈ 521 L. 521 ÷ 6 ≈ 87 minutes.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slide 13 (PDF p. 7)"
   ],
   "concept": "Duration drill: 1500 psig",
   "image_id": null
  },
  {
   "id": "NV10",
   "num": 11,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "single",
   "n": 1,
   "q": "A patient with a minute ventilation of 9 L/min is transported on a Mapleson B. What fresh gas flow range prevents rebreathing?",
   "c": [
    "About 6.3 L/min",
    "About 9 L/min",
    "About 13.5-22.5 L/min",
    "About 27 L/min"
   ],
   "a": [
    2
   ],
   "exp": "Mapleson B and C: 1.5-2.5 × MV = 13.5-22.5 L/min. 6.3 L/min would be the Mapleson A minimum (0.7 × MV).",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 21 (PDF p. 11)"
   ],
   "concept": "Mapleson B drill",
   "image_id": null
  },
  {
   "id": "NI23",
   "num": 12,
   "lec": "CO2 & scavenging",
   "lk": "co2",
   "type": "multi",
   "n": 2,
   "q": "Right after the CO2 canister is changed, the leak check fails. Which causes are most likely? Select 2.",
   "c": [
    "A failed fail-safe valve",
    "The canister not seated properly",
    "An exhausted indicator dye",
    "A crossed hospital pipeline",
    "Absorbent granules on the gasket",
    "An empty O2 cylinder"
   ],
   "a": [
    1,
    4
   ],
   "exp": "Low-pressure leaks most commonly occur at the absorber: loose screws, worn gaskets, granules on gaskets, open petcock, or a poorly seated canister. Pipelines, cylinders, and the fail-safe are upstream of the low-pressure system.",
   "disc": null,
   "supp": null,
   "ref": [
    "CO2 Absorbents and Scavenging (McPherson): slide 13 (PDF p. 7)",
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 19 (PDF p. 10)"
   ],
   "concept": "Leak after canister change",
   "image_id": null
  },
  {
   "id": "NV29",
   "num": 13,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "single",
   "n": 1,
   "q": "Power fails with 25 minutes left in the case, and the battery typically lasts about 40 minutes. What is the right approach?",
   "c": [
    "Set up TIVA and manual ventilation now in case the battery runs short",
    "Turn off the monitors to save battery for the ventilator",
    "Nothing; the battery will easily outlast the case",
    "Increase fresh gas flow so the case finishes faster"
   ],
   "a": [
    0
   ],
   "exp": "Battery life varies (about 40 minutes, some 1-2 hours, less if not fully charged). The lecture's plan is to set up alternatives within the window rather than gamble on the battery.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slides 25, 32 (PDF p. 13, 16)"
   ],
   "concept": "Don't gamble on the battery",
   "image_id": null
  },
  {
   "id": "NI03",
   "num": 14,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "Running on a limited O2 cylinder, which change stretches the supply the most while you arrange more O2?",
   "c": [
    "Switch to manual (bag) ventilation with low fresh gas flow",
    "Increase fresh gas flow to protect oxygenation",
    "Switch the ventilator to a faster rate with smaller breaths",
    "Use the O2 flush periodically"
   ],
   "a": [
    0
   ],
   "exp": "The ventilator's driving gas comes from the O2 supply, so hand ventilation eliminates that use, and low FGF reduces the rest. Flushing wastes 35-75 L/min.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 5, 13 (PDF p. 3, 7)",
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 23 (PDF p. 12)"
   ],
   "concept": "Conserving cylinder O2",
   "image_id": null
  },
  {
   "id": "NG12",
   "num": 15,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "Why does the lecture require full and empty cylinders to be stored separately?",
   "c": [
    "So full cylinders don't transfill empty ones",
    "So empty cylinders can be refilled in place",
    "So gauges stay calibrated",
    "So an empty cylinder isn't grabbed in an emergency"
   ],
   "a": [
    3
   ],
   "exp": "Separate storage (on nonflammable racks) keeps a provider from grabbing an empty cylinder during an emergency. Transfilling happens between open cylinders on a double yoke, not in storage.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slide 10 (PDF p. 5)"
   ],
   "concept": "Cylinder storage rationale",
   "image_id": null
  },
  {
   "id": "NI17",
   "num": 16,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "multi",
   "n": 2,
   "q": "After an airway fire, why does the lecture include pouring saline into the airway and considering bronchoscopy? Select 2.",
   "c": [
    "Bronchoscopy is done before stopping the gases",
    "Bronchoscopy assesses injury and finds retained debris",
    "Saline replaces the need to remove burning material",
    "Saline extinguishes residual burning material",
    "Bronchoscopy replaces reintubation",
    "Saline raises FiO2 in the airway"
   ],
   "a": [
    1,
    3
   ],
   "exp": "After pulling the tube and stopping gases, pour saline to put out residual fire, remove burning material, mask ventilate, then assess injury, consider bronchoscopy, and reintubate.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 36 (PDF p. 18)"
   ],
   "concept": "Saline and bronchoscopy after airway fire",
   "image_id": null
  },
  {
   "id": "NG07",
   "num": 17,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "An O2 E-cylinder reads 1200 psig. About how long will it supply a patient at 8 L/min?",
   "c": [
    "About 26 minutes",
    "About 52 minutes",
    "About 83 minutes",
    "About 150 minutes"
   ],
   "a": [
    1
   ],
   "exp": "1200/1900 × 660 L ≈ 417 L. 417 L ÷ 8 L/min ≈ 52 minutes. 150 minutes treats psig as liters divided by 8.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slide 13 (PDF p. 7)"
   ],
   "concept": "O2 duration at 1200 psig",
   "image_id": null
  },
  {
   "id": "NI28",
   "num": 18,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "The Tec 6 shows a 'no output' alarm during maintenance. What is the main clinical risk, and what should you do?",
   "c": [
    "Hypoxemia; increase the O2 flow right away",
    "Barotrauma; open the APL valve fully",
    "Awareness; give IV anesthetic while troubleshooting",
    "Overdose; turn off all fresh gas flow now"
   ],
   "a": [
    2
   ],
   "exp": "No output means no des delivery, so the patient will lighten as expired agent falls. Cover with IV anesthetic while you troubleshoot (power, fill level, warm-up).",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 64, 65 (PDF p. 32, 33)",
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 32 (PDF p. 16)"
   ],
   "concept": "Tec 6 no-output alarm",
   "image_id": null
  },
  {
   "id": "NI06",
   "num": 19,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "single",
   "n": 1,
   "q": "The morning check shows the machine's backup O2 cylinder at 400 psig. What should happen before the first case?",
   "c": [
    "Leave it; the pipeline makes the backup unnecessary",
    "Replace it; a nearly empty backup is a hypoxemia hazard",
    "Open it and leave it on to top up the pipeline",
    "Record it; replace only if it drops below 100 psig"
   ],
   "a": [
    1
   ],
   "exp": "Failure of the backup O2 reserve and an empty cylinder are highlighted hypoxemia hazards the machine check should catch. At 400 psig (about 140 L), the backup would last only minutes in a pipeline failure.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 19 (PDF p. 10)",
    "Medical Gas Systems in Anesthesia (Elmore): slide 13 (PDF p. 7)"
   ],
   "concept": "Low backup cylinder",
   "image_id": null
  },
  {
   "id": "NC12",
   "num": 20,
   "lec": "CO2 & scavenging",
   "lk": "co2",
   "type": "single",
   "n": 1,
   "q": "Which reaction occurs FIRST when exhaled CO2 reaches soda lime?",
   "c": [
    "CO2 combines with water to form carbonic acid",
    "Carbonic acid reacts with calcium hydroxide",
    "Calcium carbonate releases water",
    "Sodium carbonate reacts with calcium hydroxide"
   ],
   "a": [
    0
   ],
   "exp": "Sequence: CO2 + H2O → H2CO3; carbonic acid reacts rapidly with NaOH/KOH to form carbonates, water, and heat; then over minutes the carbonates react with Ca(OH)2 to form CaCO3 and regenerate NaOH.",
   "disc": null,
   "supp": null,
   "ref": [
    "CO2 Absorbents and Scavenging (McPherson): slide 2 (PDF p. 1)"
   ],
   "concept": "First absorbent reaction",
   "image_id": null
  },
  {
   "id": "NI27",
   "num": 21,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "Mid-case, you realize the sevoflurane vaporizer was refilled with isoflurane. Agent analysis shows iso well above the dialed value. What is the FIRST step?",
   "c": [
    "Lower the dial to half and continue",
    "Keep going, since iso and sevo are equipotent",
    "Drain it immediately while it's still mounted and on",
    "Turn that vaporizer off and maintain anesthesia another way"
   ],
   "a": [
    3
   ],
   "exp": "Iso's higher vapor pressure makes the sevo-calibrated vaporizer overdeliver, and iso is more potent. Stop delivery from that vaporizer first; draining and servicing happen after it's out of use.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 54, 70 (PDF p. 27, 35)",
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 24 (PDF p. 12)"
   ],
   "concept": "Misfilled vaporizer mid-case",
   "image_id": null
  },
  {
   "id": "NV12",
   "num": 22,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "single",
   "n": 1,
   "q": "240 V is applied across 1,200 ohms. What current flows?",
   "c": [
    "0.02 A",
    "0.2 A",
    "2 A",
    "288 A"
   ],
   "a": [
    1
   ],
   "exp": "I = E/R = 240/1,200 = 0.2 A (200 mA). 288 comes from multiplying.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 26 (PDF p. 13)"
   ],
   "concept": "Ohm's law drill",
   "image_id": null
  },
  {
   "id": "NV19",
   "num": 23,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "multi",
   "n": 2,
   "q": "Which of these are OXIDIZERS in the OR fire triangle? Select 2.",
   "c": [
    "Oxygen",
    "Alcohol prep",
    "Helium",
    "Electrosurgical unit",
    "Nitrous oxide",
    "Paper drapes"
   ],
   "a": [
    0,
    4
   ],
   "exp": "The main OR oxidizers are air, O2, and N2O. Drapes and alcohol prep are fuel, the ESU is an ignition source, and helium isn't listed as an oxidizer.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 33 (PDF p. 17)"
   ],
   "concept": "Oxidizers",
   "image_id": null
  },
  {
   "id": "NG28",
   "num": 24,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "Running on cylinder O2 only, the cylinder gradually empties while N2O is on. In what order do things happen?",
   "c": [
    "O2 supply alarm → N2O proportionally reduced → N2O stopped",
    "Nothing changes until the cylinder reads 0 psig",
    "N2O stopped → O2 supply alarm → N2O reduced",
    "N2O reduced → N2O stopped → O2 supply alarm"
   ],
   "a": [
    0
   ],
   "exp": "As O2 supply pressure falls, the low-pressure alarm warns first, then the fail-safe proportionally reduces other gases (below about 25-30 psig) and finally stops them (below about 20).",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 33, 34 (PDF p. 17)"
   ],
   "concept": "Emptying cylinder sequence",
   "image_id": null
  },
  {
   "id": "NV02",
   "num": 25,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "A patient on 2 L/min nasal cannula is transported with an O2 E-cylinder reading 800 psig. About how long is available?",
   "c": [
    "About 35 minutes",
    "About 70 minutes",
    "About 139 minutes",
    "About 400 minutes"
   ],
   "a": [
    2
   ],
   "exp": "800/1900 × 660 ≈ 278 L. 278 ÷ 2 ≈ 139 minutes. 400 would treat psig as liters.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slide 13 (PDF p. 7)"
   ],
   "concept": "Duration drill: 800 psig",
   "image_id": null
  },
  {
   "id": "NC07",
   "num": 26,
   "lec": "CO2 & scavenging",
   "lk": "co2",
   "type": "single",
   "n": 1,
   "q": "Under the same desiccated conditions, which absorbent produces more CO?",
   "c": [
    "Neither produces CO",
    "Soda lime",
    "They produce equal amounts",
    "Barium hydroxide lime (Baralyme)"
   ],
   "a": [
    3
   ],
   "exp": "CO production is greater with barium hydroxide lime than with soda lime, and it rises with desiccation, temperature, and agent concentration.",
   "disc": null,
   "supp": null,
   "ref": [
    "CO2 Absorbents and Scavenging (McPherson): slide 7 (PDF p. 4)"
   ],
   "concept": "Baralyme and CO",
   "image_id": null
  },
  {
   "id": "NG02",
   "num": 27,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "On this variable bypass vaporizer, the dial is turned from 1% to 3%. Flow through which numbered path increases?",
   "c": [
    "Path 1",
    "Path 2",
    "Path 4",
    "None; only temperature changes output"
   ],
   "a": [
    1
   ],
   "exp": "Path 2 carries fresh gas into the vaporizing chamber. Turning the dial up directs more fresh gas there, lowering the splitting ratio. Path 1 is the bypass, and 4 is the outflow at the dialed concentration.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 53, 54 (PDF p. 27)"
   ],
   "concept": "Bypass diagram: chamber flow",
   "image_id": "img-gas-variable-bypass"
  },
  {
   "id": "NM05",
   "num": 28,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "multi",
   "n": 2,
   "q": "Which temperature facts are correct? Select 2.",
   "c": [
    "CO2 is stored as gas only",
    "N2O's critical temperature is about 36 °C",
    "N2O's critical temperature is −88 °C",
    "O2's critical temperature is −183 °C",
    "O2's critical temperature is −118.6 °C",
    "Medical air is liquid in an E-cylinder at room temperature"
   ],
   "a": [
    1,
    4
   ],
   "exp": "O2's critical temperature is −118.6 °C (it boils at −183 °C at 1 atm). N2O's critical temperature is about 36 °C (it boils at −88 °C), so it's liquid in an E-cylinder at room temperature. Air is a gas; CO2 is liquid/gas.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 11, 14 (PDF p. 6, 7)"
   ],
   "concept": "Critical temperatures",
   "image_id": null
  },
  {
   "id": "NA12",
   "num": 29,
   "lec": "Airway",
   "lk": "air",
   "type": "single",
   "n": 1,
   "q": "Which tube feature does the ISO standard address that directly affects ventilation if the bevel is blocked against the tracheal wall?",
   "c": [
    "Cuff color",
    "Radiopaque stripe",
    "Murphy eye",
    "Pilot balloon"
   ],
   "a": [
    2
   ],
   "exp": "The Murphy eye is on the ISO list (with ID/OD, distance markers, toxicity, bevel, radius of curvature). It provides an alternate path for gas if the bevel opening is occluded.",
   "disc": null,
   "supp": null,
   "ref": [
    "Airway Equipment (McPherson): slide 7 (PDF p. 7)"
   ],
   "concept": "Murphy eye",
   "image_id": null
  },
  {
   "id": "NC03",
   "num": 30,
   "lec": "CO2 & scavenging",
   "lk": "co2",
   "type": "single",
   "n": 1,
   "q": "When lettered component G is switched from bag to ventilator, which lettered valve is taken out of the circuit?",
   "c": [
    "Valve H",
    "Valve K",
    "Valve B",
    "Valve E"
   ],
   "a": [
    0
   ],
   "exp": "G is the manual/automatic selector. Switching to ventilator connects the bellows (J) and takes the reservoir bag (I) and APL (H) out of circuit, so adjusting the APL does nothing during mechanical ventilation.",
   "disc": null,
   "supp": null,
   "ref": [
    "CO2 Absorbents and Scavenging (McPherson): slide 19 (PDF p. 10)"
   ],
   "concept": "Diagram: selector valve",
   "image_id": "img-co2-scavenging-circuit"
  },
  {
   "id": "NI16",
   "num": 31,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "single",
   "n": 1,
   "q": "Which ignition source is easy to overlook because it isn't in the surgeon's hand?",
   "c": [
    "A fiberoptic light cord end resting on the drapes",
    "The ETT cuff and its pilot balloon",
    "The BP cuff on the upper arm",
    "The pulse oximeter probe on a finger"
   ],
   "a": [
    0
   ],
   "exp": "The lecture lists the ESU, lasers, and the ends of fiberoptic light cords as ignition sources. A light cord left on the drapes can ignite them.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 33 (PDF p. 17)"
   ],
   "concept": "Overlooked ignition source",
   "image_id": null
  },
  {
   "id": "NI32",
   "num": 32,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "single",
   "n": 1,
   "q": "A tech completes the morning check; the provider doesn't confirm it. Mid-case, the pipeline fails and the O2 cylinder turns out to be closed and nearly empty. Which aggravating factor best describes the provider's role?",
   "c": [
    "Inexperience with the machine",
    "Failure to check equipment",
    "Fatigue from long work hours",
    "Haste under schedule pressure"
   ],
   "a": [
    1
   ],
   "exp": "The lecture says to confirm the machine check was actually done, especially when delegated. An unverified check that missed an empty backup is failure to check equipment.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slides 18, 19 (PDF p. 9, 10)"
   ],
   "concept": "Unverified delegated check",
   "image_id": null
  },
  {
   "id": "NG33",
   "num": 33,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "Sevo at 3% with 1 L/min FGF versus des at 6% with 1 L/min FGF. How does hourly liquid use compare?",
   "c": [
    "They're equal at 9 mL/hr",
    "Des uses twice as much (18 vs 9 mL/hr)",
    "Des uses six times as much",
    "Sevo uses twice as much (18 vs 9 mL/hr)"
   ],
   "a": [
    1
   ],
   "exp": "mL/hr = vol% × FGF × 3: sevo 3 × 1 × 3 = 9; des 6 × 1 × 3 = 18. The formula scales directly with the dialed percentage.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 50, 52 (PDF p. 25, 26)"
   ],
   "concept": "Consumption comparison",
   "image_id": null
  },
  {
   "id": "NG25",
   "num": 34,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "single",
   "n": 1,
   "q": "A copper kettle with isoflurane (vapor pressure 240 mmHg) receives 100 mL/min of O2. The saturated gas joins 5 L/min of fresh gas. Roughly what concentration is delivered?",
   "c": [
    "About 0.5%",
    "About 0.9%",
    "About 4.6%",
    "About 32%"
   ],
   "a": [
    1
   ],
   "exp": "Saturated gas is 240/760 ≈ 32% vapor, so vapor added = 100 × 240/(760 − 240) ≈ 46 mL/min. 46 mL in about 5,146 mL total ≈ 0.9%. The kettle isn't concentration-calibrated, which is why these calculations are required.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 50, 74 (PDF p. 25, 37)"
   ],
   "concept": "Copper kettle calculation",
   "image_id": null
  },
  {
   "id": "NC09",
   "num": 35,
   "lec": "CO2 & scavenging",
   "lk": "co2",
   "type": "multi",
   "n": 2,
   "q": "Which OR ventilation setups meet the lecture's air exchange requirements? Select 2.",
   "c": [
    "Recirculating, 17 exchanges per hour with 3 fresh",
    "Nonrecirculating, 12 exchanges per hour",
    "Recirculating, 20 exchanges per hour with 1 fresh plus filters",
    "Recirculating, 14 exchanges per hour with 4 fresh",
    "Nonrecirculating, 16 exchanges per hour",
    "Recirculating, 21 exchanges per hour with 2 fresh"
   ],
   "a": [
    0,
    4
   ],
   "exp": "Nonrecirculating systems should provide 15 or more exchanges per hour. Recirculating systems need 15-21 per hour with at least 3 fresh outside air; filters don't remove anesthetic gases.",
   "disc": null,
   "supp": null,
   "ref": [
    "CO2 Absorbents and Scavenging (McPherson): slides 16, 17 (PDF p. 8, 9)"
   ],
   "concept": "Air exchange requirements",
   "image_id": null
  },
  {
   "id": "NG01",
   "num": 36,
   "lec": "Medical gases",
   "lk": "gas",
   "type": "multi",
   "n": 3,
   "q": "Which numbered components on this machine roadmap sit in the intermediate-pressure system? Select 3.",
   "c": [
    "Component 1",
    "Component 2",
    "Component 3",
    "Component 4",
    "Component 5",
    "None of the numbered components"
   ],
   "a": [
    0,
    1,
    2
   ],
   "exp": "The intermediate system runs from the first-stage regulator and pipeline inlets to the flow control valves. It contains the fail-safe (1) and the second-stage O2 and N2O regulators (2, 3). The pressure relief valve (4) and outlet check valve (5) sit downstream of the vaporizers in the low-pressure system.",
   "disc": null,
   "supp": null,
   "ref": [
    "Medical Gas Systems in Anesthesia (Elmore): slides 5, 26, 76 (PDF p. 3, 13, 38)"
   ],
   "concept": "Roadmap: pressure zones",
   "image_id": "img-gas-machine-roadmap"
  },
  {
   "id": "NI25",
   "num": 37,
   "lec": "Hazards & safety",
   "lk": "haz",
   "type": "single",
   "n": 1,
   "q": "A paralyzed patient is ventilated through a Mapleson A for transport. Why is that a poor choice?",
   "c": [
    "Mapleson A needs no fresh gas during controlled ventilation",
    "Mapleson A's tubing is too short for adults",
    "Mapleson A can't connect to an ETT",
    "Mapleson A is designed for spontaneous breathing; B or C suits controlled ventilation"
   ],
   "a": [
    3
   ],
   "exp": "The lecture says the Mapleson A should be used only with spontaneously breathing patients. For controlled ventilation, B and C work, since the patient isn't doing the extra work of breathing, with FGF 1.5-2.5 × MV.",
   "disc": null,
   "supp": null,
   "ref": [
    "Anesthesia Workstation Hazards & Safety (McPherson): slide 21 (PDF p. 11)"
   ],
   "concept": "Mapleson A with controlled ventilation",
   "image_id": null