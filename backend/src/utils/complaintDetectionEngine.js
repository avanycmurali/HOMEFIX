/**
 * HOMEFIX - Deterministic Rule-Based Complaint Detection Engine
 * 
 * Maps spoken or typed complaint text (in English or Malayalam)
 * to service categories, problem types, and extracted keywords.
 * 
 * NOTE: This is a 100% deterministic, rule-based keyword matching engine.
 * It does NOT use machine learning or external AI APIs.
 */

// Service category configurations and keyword rules
export const SERVICE_RULES = [
  {
    service_id: 2,
    service_name: 'Plumbing Services',
    keywords_en: [
      'tap', 'taps', 'pipe', 'pipes', 'piping', 'leak', 'leaks', 'leaking', 'leakage',
      'sink', 'sinks', 'drain', 'drains', 'drainage', 'water', 'flush', 'valve', 'valves',
      'faucet', 'faucets', 'shower', 'showers', 'blockage', 'clog', 'clogged', 'toilet',
      'basin', 'washbasin', 'overflow', 'tank', 'cistern', 'geyser pipe', 'spigot', 'bibcock',
      'sewage', 'sewer', 'pipeline', 'plumber', 'plumbing'
    ],
    keywords_ml: [
      'ടാപ്പ്', 'പൈപ്പ്', 'വെള്ളം', 'ചോർച്ച', 'ചോരുന്നു', 'ലീക്ക്', 'കുഴൽ', 'സിങ്ക്',
      'ഡ്രെയിൻ', 'തടസ്സം', 'വാട്ടർ', 'ക്ലോസറ്റ്', 'പൈപ്പിൽ', 'ഷവർ', 'ഫ്ലഷ്', 'ടാങ്കിൽ',
      'ചോർച്ചയുണ്ട്', 'പൊട്ടി', 'ഒഴുക്ക്', 'തടസ്സപ്പെട്ടു', 'കക്കൂസ്', 'ബേസിൻ', 'വാഷ്ബേസിൻ',
      'വെള്ളച്ചോർച്ച', 'വാട്ടർ ടാങ്ക്'
    ],
    problem_patterns: [
      {
        problem: 'Tap Leakage / Repair',
        keywords_en: ['tap', 'faucet', 'spigot', 'bibcock'],
        keywords_ml: ['ടാപ്പ്']
      },
      {
        problem: 'Pipe Leakage / Burst',
        keywords_en: ['pipe', 'pipes', 'leak', 'leakage', 'leaking', 'burst'],
        keywords_ml: ['പൈപ്പ്', 'ചോർച്ച', 'ചോരുന്നു', 'ലീക്ക്', 'പൊട്ടി', 'വെള്ളച്ചോർച്ച']
      },
      {
        problem: 'Drainage / Sink Blockage',
        keywords_en: ['drain', 'drainage', 'sink', 'blockage', 'clog', 'clogged'],
        keywords_ml: ['സിങ്ക്', 'ഡ്രെയിൻ', 'തടസ്സം', 'തടസ്സപ്പെട്ടു', 'ഒഴുക്ക്']
      },
      {
        problem: 'Flush / Toilet Issue',
        keywords_en: ['toilet', 'flush', 'cistern', 'commode', 'closet'],
        keywords_ml: ['ഫ്ലഷ്', 'ക്ലോസറ്റ്', 'കക്കൂസ്']
      },
      {
        problem: 'Water Tank / Supply Issue',
        keywords_en: ['tank', 'overflow', 'water supply'],
        keywords_ml: ['ടാങ്കിൽ', 'വാട്ടർ ടാങ്ക്']
      }
    ],
    default_problem: 'Plumbing Repair / Maintenance'
  },
  {
    service_id: 1,
    service_name: 'Electrical Services',
    keywords_en: [
      'fan', 'fans', 'ceiling fan', 'exhaust fan', 'light', 'lights', 'bulb', 'bulbs',
      'switch', 'switches', 'socket', 'sockets', 'wire', 'wires', 'wiring', 'power',
      'current', 'spark', 'sparks', 'sparking', 'shock', 'shocks', 'fuse', 'mcb',
      'breaker', 'tripping', 'short circuit', 'plug', 'voltage', 'inverter', 'led',
      'tubelight', 'electric', 'electrical', 'electrician'
    ],
    keywords_ml: [
      'ഫാൻ', 'ലൈറ്റ്', 'സ്വിച്ച്', 'സോക്കറ്റ്', 'വൈദ്യുതി', 'കറന്റ്', 'വയർ', 'വയറിംഗ്',
      'mcb', 'ഫ്യൂസ്', 'സ്പാർക്ക്', 'ഷോക്ക്', 'ബൾബ്', 'ഷോർട്ട്', 'ട്രിപ്പ്', 'പ്ലഗ്',
      'ഇൻവെർട്ടർ', 'ട്യൂബ് ലൈറ്റ്', 'കത്തുന്നില്ല', 'തീപ്പൊരി', 'വൈദ്യുത'
    ],
    problem_patterns: [
      {
        problem: 'Fan Repair / Replacement',
        keywords_en: ['fan', 'ceiling fan', 'exhaust fan'],
        keywords_ml: ['ഫാൻ']
      },
      {
        problem: 'Switch / Socket Repair',
        keywords_en: ['switch', 'socket', 'plug'],
        keywords_ml: ['സ്വിച്ച്', 'സോക്കറ്റ്', 'പ്ലഗ്']
      },
      {
        problem: 'Light / Bulb Replacement',
        keywords_en: ['light', 'bulb', 'led', 'tubelight'],
        keywords_ml: ['ലൈറ്റ്', 'ബൾബ്', 'ട്യൂബ് ലൈറ്റ്', 'കത്തുന്നില്ല']
      },
      {
        problem: 'MCB Tripping / Power Shortage',
        keywords_en: ['mcb', 'fuse', 'tripping', 'short circuit', 'current', 'spark', 'shock'],
        keywords_ml: ['mcb', 'ഫ്യൂസ്', 'കറന്റ്', 'സ്പാർക്ക്', 'ഷോക്ക്', 'ട്രിപ്പ്', 'തീപ്പൊരി']
      },
      {
        problem: 'Wiring / Rewiring Work',
        keywords_en: ['wire', 'wiring', 'wires'],
        keywords_ml: ['വയർ', 'വയറിംഗ്']
      }
    ],
    default_problem: 'Electrical Inspection / Repair'
  },
  {
    service_id: 4,
    service_name: 'AC & Appliance Repair',
    keywords_en: [
      'ac', 'air conditioner', 'air conditioning', 'cool', 'cooling', 'not cooling',
      'gas', 'refrigerant', 'fridge', 'refrigerator', 'washing machine', 'microwave',
      'oven', 'compressor', 'filter', 'geyser', 'water heater', 'appliance', 'deep freezer',
      'cooler'
    ],
    keywords_ml: [
      'എസി', 'തണുപ്പ്', 'കൂളിംഗ്', 'തണുക്കുന്നില്ല', 'ഗ്യാസ്', 'വാഷിംഗ് മെഷീൻ',
      'ഫ്രിഡ്ജ്', 'റഫ്രിജറേറ്റർ', 'ഗീസർ', 'വാട്ടർ ഹീറ്റർ', 'കംപ്രസ്സർ', 'എയർ കണ്ടീഷണർ'
    ],
    problem_patterns: [
      {
        problem: 'AC Not Cooling / Gas Refill',
        keywords_en: ['ac', 'air conditioner', 'cool', 'cooling', 'not cooling', 'gas'],
        keywords_ml: ['എസി', 'തണുപ്പ്', 'കൂളിംഗ്', 'തണുക്കുന്നില്ല', 'ഗ്യാസ്']
      },
      {
        problem: 'Refrigerator Cooling Issue',
        keywords_en: ['fridge', 'refrigerator', 'deep freezer'],
        keywords_ml: ['ഫ്രിഡ്ജ്', 'റഫ്രിജറേറ്റർ']
      },
      {
        problem: 'Washing Machine Repair',
        keywords_en: ['washing machine'],
        keywords_ml: ['വാഷിംഗ് മെഷീൻ']
      },
      {
        problem: 'Water Heater / Geyser Repair',
        keywords_en: ['geyser', 'water heater'],
        keywords_ml: ['ഗീസർ', 'വാട്ടർ ഹീറ്റർ']
      }
    ],
    default_problem: 'Appliance Servicing / Diagnostic'
  },
  {
    service_id: 3,
    service_name: 'Carpentry Services',
    keywords_en: [
      'door', 'doors', 'window', 'windows', 'lock', 'locks', 'latch', 'latches',
      'table', 'chair', 'cupboard', 'wardrobe', 'wood', 'wooden', 'hinge', 'hinges',
      'shelf', 'shelves', 'cabinet', 'cabinets', 'furniture', 'handle', 'drawer',
      'drawers', 'carpenter', 'carpentry'
    ],
    keywords_ml: [
      'വാതിൽ', 'ജനൽ', 'ലോക്ക്', 'ലാച്ച്', 'മേശ', 'കസേര', 'അലമാര', 'മരം',
      'ഹിഞ്ച്', 'പൂട്ട്', 'കാബിനറ്റ്', 'ഡ്രോയർ', 'ഫർണിച്ചർ', 'കട്ടിൽ'
    ],
    problem_patterns: [
      {
        problem: 'Door / Lock Repair',
        keywords_en: ['door', 'lock', 'latch', 'handle', 'hinge'],
        keywords_ml: ['വാതിൽ', 'ലോക്ക്', 'പൂട്ട്', 'ലാച്ച്', 'ഹിഞ്ച്']
      },
      {
        problem: 'Window Repair / Adjustment',
        keywords_en: ['window', 'windows'],
        keywords_ml: ['ജനൽ']
      },
      {
        problem: 'Furniture / Cupboard Assembly',
        keywords_en: ['cupboard', 'wardrobe', 'table', 'chair', 'cabinet', 'drawer'],
        keywords_ml: ['മേശ', 'കസേര', 'അലമാര', 'കാബിനറ്റ്', 'ഡ്രോയർ', 'ഫർണിച്ചർ']
      }
    ],
    default_problem: 'Carpentry Woodwork / Fitting'
  },
  {
    service_id: 6,
    service_name: 'Deep Home Cleaning',
    keywords_en: [
      'clean', 'cleaning', 'wash', 'washing', 'dirty', 'dirt', 'deep clean', 'deep cleaning',
      'stains', 'stain', 'sanitize', 'sanitization', 'floor cleaning', 'bathroom cleaning',
      'kitchen cleaning', 'dust', 'dusty', 'sofa cleaning', 'mop', 'house cleaning'
    ],
    keywords_ml: [
      'വൃത്തിയാക്കൽ', 'ക്ലീനിംഗ്', 'അഴുക്ക്', 'ശുചീകരണം', 'ഡീപ് ക്ലീൻ', 'കറ',
      'തറ', 'സോഫ', 'ബാത്ത്റൂം', 'പൊടി'
    ],
    problem_patterns: [
      {
        problem: 'Bathroom Deep Cleaning',
        keywords_en: ['bathroom cleaning', 'bathroom', 'toilet clean'],
        keywords_ml: ['ബാത്ത്റൂം']
      },
      {
        problem: 'Sofa / Upholstery Cleaning',
        keywords_en: ['sofa', 'upholstery', 'carpet'],
        keywords_ml: ['സോഫ']
      },
      {
        problem: 'Kitchen / Full House Deep Clean',
        keywords_en: ['kitchen cleaning', 'floor cleaning', 'deep clean', 'deep cleaning', 'sanitize'],
        keywords_ml: ['വൃത്തിയാക്കൽ', 'ശുചീകരണം', 'ഡീപ് ക്ലീൻ', 'തറ']
      }
    ],
    default_problem: 'Comprehensive Deep Cleaning'
  },
  {
    service_id: 5,
    service_name: 'Home Painting',
    keywords_en: [
      'paint', 'painting', 'painter', 'color', 'colour', 'wall', 'walls',
      'whitewash', 'peeling', 'coat', 'primer', 'dampness', 'wall cracks',
      'exterior painting', 'interior painting', 'distemper'
    ],
    keywords_ml: [
      'പെയിന്റ്', 'പെയിന്റിംഗ്', 'ചായം', 'പൂശൽ', 'ചോർച്ച പാടുകൾ', 'ചുമര്',
      'ഭിത്തി', 'പ്രൈമർ', 'പെയിന്റർ'
    ],
    problem_patterns: [
      {
        problem: 'Wall Dampness / Leak Stains Touchup',
        keywords_en: ['dampness', 'peeling', 'wall cracks', 'leak stains'],
        keywords_ml: ['ചോർച്ച പാടുകൾ', 'പൂശൽ']
      },
      {
        problem: 'Interior / Wall Painting',
        keywords_en: ['paint', 'painting', 'wall', 'primer', 'color'],
        keywords_ml: ['പെയിന്റ്', 'പെയിന്റിംഗ്', 'ചായം', 'ചുമര്', 'ഭിത്തി']
      }
    ],
    default_problem: 'Home Painting & Wall Care'
  }
];

/**
 * Detect service category, problem type, and matched keywords from text
 * @param {string} text - Transcription or complaint description in English/Malayalam
 * @returns {object} Detection result
 */
export const detectComplaintDetails = (text = '') => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      detected_service: null,
      service_id: null,
      detected_problem: null,
      matched_keywords: [],
      detection_method: 'rule_based_speech_to_text',
      match_found: false
    };
  }

  const normalized = text.toLowerCase().trim();
  let bestMatch = null;
  let highestScore = 0;
  let allMatchedKeywords = [];

  for (const rule of SERVICE_RULES) {
    const matchedEn = [];
    const matchedMl = [];

    // Check English keywords
    for (const kw of rule.keywords_en) {
      // Use regex word boundary for short English words (<= 3 letters) to prevent false positives like 'an' in 'fan'
      if (kw.length <= 3) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(normalized)) {
          matchedEn.push(kw);
        }
      } else {
        if (normalized.includes(kw.toLowerCase())) {
          matchedEn.push(kw);
        }
      }
    }

    // Check Malayalam keywords (direct substring match works accurately for Malayalam script)
    for (const kw of rule.keywords_ml) {
      if (text.includes(kw)) {
        matchedMl.push(kw);
      }
    }

    const currentMatches = [...matchedEn, ...matchedMl];
    const totalScore = matchedEn.length + (matchedMl.length * 1.5); // Give Malayalam exact matches slight weight

    if (currentMatches.length > 0 && totalScore > highestScore) {
      highestScore = totalScore;
      allMatchedKeywords = currentMatches;

      // Determine specific problem type based on matched sub-patterns
      let detectedProblem = rule.default_problem;
      for (const pattern of rule.problem_patterns) {
        const hasEn = pattern.keywords_en.some((k) => matchedEn.includes(k));
        const hasMl = pattern.keywords_ml.some((k) => matchedMl.includes(k));
        if (hasEn || hasMl) {
          detectedProblem = pattern.problem;
          break;
        }
      }

      bestMatch = {
        detected_service: rule.service_name,
        service_id: rule.service_id,
        detected_problem: detectedProblem,
        matched_keywords: currentMatches,
        detection_method: 'rule_based_speech_to_text',
        match_found: true
      };
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  // Fallback if no specific keywords matched
  return {
    detected_service: null,
    service_id: null,
    detected_problem: null,
    matched_keywords: [],
    detection_method: 'rule_based_speech_to_text',
    match_found: false
  };
};
