/**
 * Rule-Based Tool & Material Recommendation Engine for HOMEFIX Technicians
 *
 * Deterministic rule-based matching that analyzes:
 * - Service Category
 * - Complaint Title
 * - Complaint Description
 *
 * Returns recommended tools, required materials, and relevant safety guidelines.
 * This is a deterministic expert rule engine, NOT machine learning.
 */

// =============================================================================
// DOMAIN SAFETY GUIDELINES PER SERVICE CATEGORY
// =============================================================================
export const SAFETY_GUIDELINES = {
  plumbing:
    'Turn off the main overhead/inlet water supply valve and relieve line pressure before loosening pipe joints, taps, or dismantling fittings.',
  electrical:
    'Always turn off the main circuit breaker (MCB) and verify with a voltage tester that the line is de-energized before touching wires or switchboards. Never work with wet hands.',
  carpentry:
    'Wear eye protection and work gloves when using power drills, saws, or sharp wood chisels. Ensure workpieces are safely supported or clamped.',
  painting:
    'Ensure adequate cross-ventilation in all working areas. Wear a dust mask and protective goggles when scraping old paint or sanding surfaces.',
  appliance_repair:
    'Always unplug appliances from the wall outlet before removing panels or servicing internals. High-voltage capacitors can retain dangerous charge even after power is disconnected.',
  ac_servicing:
    'Disconnect electrical isolator before servicing indoor or outdoor units. Refrigerant lines operate under high pressure and must only be handled with calibrated pressure gauges.',
  cleaning:
    'Ensure good ventilation when using chemical disinfectants. Always wear rubber protective gloves and never combine chlorine bleach with ammonia or acid-based cleaners.',
};

// =============================================================================
// DETERMINISTIC RULES DICTIONARY
// =============================================================================
export const RECOMMENDATION_RULES = [
  // ---------------------------------------------------------------------------
  // 1. PLUMBING
  // ---------------------------------------------------------------------------
  {
    id: 'plumbing_leak',
    category: 'plumbing',
    keywords: [
      'plumb',
      'plumbing',
      'plumber',
      'leak',
      'leaking',
      'leakage',
      'dripping',
      'drip',
      'drips',
      'seepage',
      'pipe leak',
      'water leak',
    ],
    tools: [
      {
        name: 'Adjustable wrench',
        reason: 'For loosening and tightening threaded pipe nuts, couplings, and pipe joints without slipping.',
      },
      {
        name: 'Pipe wrench',
        reason: 'Provides heavy grip and leverage on round metal pipes and stubborn fittings.',
      },
      {
        name: 'Screwdriver set',
        reason: 'For removing access panels, pipe mounting brackets, and fixture housings.',
      },
    ],
    materials: [
      {
        name: 'PTFE/Teflon tape',
        reason: 'Applied over male pipe threads to create a watertight, leakproof seal.',
      },
      {
        name: 'Replacement washer',
        reason: 'Replaces worn, brittle, or cracked rubber washers causing water leaks.',
      },
      {
        name: 'Pipe sealant',
        reason: 'PVC or silicone sealant for sealing threaded connections and minor joint gaps.',
      },
    ],
    safetyNote: 'Shut off the local stopcock or main water valve before dismantling pipe connections.',
  },
  {
    id: 'plumbing_blocked',
    category: 'plumbing',
    keywords: [
      'blocked',
      'blockage',
      'clogged',
      'clog',
      'clogging',
      'drainage',
      'drain',
      'overflow',
      'slow drain',
      'choked',
      'water backing up',
    ],
    tools: [
      {
        name: 'Drain snake',
        reason: 'Augers deep into waste lines to physically snag and clear stubborn debris and hair blockages.',
      },
      {
        name: 'Plunger',
        reason: 'Creates hydraulic pressure suction to dislodge clogs in sinks, drains, or toilet bowls.',
      },
      {
        name: 'Pipe wrench',
        reason: 'Used to disassemble P-traps and drainage pipes for physical inspection and clearing.',
      },
    ],
    materials: [
      {
        name: 'Drain cleaner',
        reason: 'Dissolves organic build-up, grease, and soap scum inside the drainage pathway.',
      },
      {
        name: 'Replacement pipe seal',
        reason: 'Ensures tight sealing after reassembling dismantled drainage joints.',
      },
      {
        name: 'Pipe fittings',
        reason: 'Spares for replacing damaged or corroded drainage connectors and couplings.',
      },
    ],
    safetyNote: 'Use protective goggles and rubber gloves when clearing blocked chemical waste lines.',
  },
  {
    id: 'plumbing_tap',
    category: 'plumbing',
    keywords: [
      'tap',
      'faucet',
      'spout',
      'mixer',
      'bibcock',
      'water tap',
      'tap broken',
      'tap dripping',
    ],
    tools: [
      {
        name: 'Adjustable wrench',
        reason: 'For unscrewing the faucet retaining nut without scratching chrome fixture surfaces.',
      },
      {
        name: 'Screwdriver set',
        reason: 'For removing decorative index caps, handle screws, and internal spindle assemblies.',
      },
    ],
    materials: [
      {
        name: 'Faucet washer',
        reason: 'Restores the mechanical seal inside tap valve to prevent dripping from the spout.',
      },
      {
        name: 'PTFE/Teflon tape',
        reason: 'Seals threads between tap inlet and water line supply pipes.',
      },
      {
        name: 'Replacement cartridge',
        reason: 'Replaces faulty or corroded ceramic disc valve cartridge causing erratic flow.',
      },
    ],
    safetyNote: 'Isolate local angle valve beneath the basin before disassembling the tap body.',
  },
  {
    id: 'plumbing_inspection',
    category: 'plumbing',
    keywords: [
      'photo',
      'inspection',
      'inspect',
      'visual',
      'checkup',
      'diagnosis',
      'diagnostic',
      'assessment',
      'general',
      'pipe',
      'pipes',
      'fitting',
      'fittings',
      'fixture',
      'repair',
      'plumbing issue',
    ],
    tools: [
      {
        name: 'Adjustable wrench',
        reason: 'For tightening or dismantling plumbing fittings, taps, and pipe joints during inspection.',
      },
      {
        name: 'Pipe wrench',
        reason: 'Provides heavy grip on threaded pipes and stubborn couplings during diagnostic assessment.',
      },
      {
        name: 'Screwdriver set',
        reason: 'For removing access panels, fixture covers, and plumbing mounting brackets.',
      },
    ],
    materials: [
      {
        name: 'PTFE/Teflon tape',
        reason: 'Applied over male pipe threads to create a watertight, leakproof seal.',
      },
      {
        name: 'Replacement washer',
        reason: 'Assortment of common rubber and silicone washers for quick leak replacement.',
      },
      {
        name: 'Pipe sealant',
        reason: 'Waterproof sealant for sealing threaded connections and minor joint gaps.',
      },
    ],
    safetyNote: 'Turn off the main overhead/inlet water supply valve before dismantling pipe fittings.',
  },

  // ---------------------------------------------------------------------------
  // 2. ELECTRICAL
  // ---------------------------------------------------------------------------
  {
    id: 'electrical_fan',
    category: 'electrical',
    keywords: [
      'fan',
      'ceiling fan',
      'exhaust fan',
      'fan not working',
      'fan slow',
      'fan noise',
      'fan wobbling',
    ],
    tools: [
      {
        name: 'Voltage tester',
        reason: 'Safely verifies that electrical circuits are completely de-energized before touching wires.',
      },
      {
        name: 'Screwdriver set',
        reason: 'Insulated screwdrivers for opening the fan canopy, switch panel, and regulator.',
      },
      {
        name: 'Multimeter',
        reason: 'Tests winding continuity, voltage supply, and capacitor microfarad values.',
      },
    ],
    materials: [
      {
        name: 'Electrical tape',
        reason: 'Insulates wire connections and exposed splices against accidental short circuits.',
      },
      {
        name: 'Wire connectors',
        reason: 'Twist-on wire nuts or terminal blocks for secure, fire-safe wire joints.',
      },
      {
        name: 'Replacement capacitor',
        reason: 'Restores startup torque and operating speed if the existing capacitor is degraded.',
      },
    ],
    safetyNote: 'Shut off the main MCB breaker before detaching ceiling fan wiring.',
  },
  {
    id: 'electrical_switch',
    category: 'electrical',
    keywords: [
      'switch',
      'socket',
      'plug',
      'switchboard',
      'outlet',
      'spark',
      'switch broken',
      'socket not working',
    ],
    tools: [
      {
        name: 'Voltage tester',
        reason: 'Checks whether terminals and socket holes carry live current.',
      },
      {
        name: 'Screwdriver set',
        reason: 'For detaching switchboard faceplate, modular frames, and terminal screws.',
      },
      {
        name: 'Multimeter',
        reason: 'Checks continuity across switch contacts and measures line-to-neutral voltage.',
      },
    ],
    materials: [
      {
        name: 'Replacement switch/socket',
        reason: 'Replaces burned, loose, or defective modular electrical switches/sockets.',
      },
      {
        name: 'Electrical tape',
        reason: 'High-grade PVC insulation tape to wrap live terminal sides.',
      },
      {
        name: 'Wire connectors',
        reason: 'Safely splices wiring inside the junction gang box.',
      },
    ],
    safetyNote: 'Always cut power at the sub-distribution board before opening any wall switchboard.',
  },
  {
    id: 'electrical_wiring',
    category: 'electrical',
    keywords: [
      'electric',
      'electrical',
      'electrician',
      'wiring',
      'wire',
      'power',
      'power failure',
      'short circuit',
      'tripping',
      'mcb',
      'fuse',
      'blackout',
      'no power',
      'burnt wire',
    ],
    tools: [
      {
        name: 'Multimeter',
        reason: 'Traces voltage drop, open circuits, line breaks, and ground faults.',
      },
      {
        name: 'Voltage tester',
        reason: 'Non-contact voltage detector to scan cables through conduits and wall panels.',
      },
      {
        name: 'Wire stripper',
        reason: 'Strips outer insulation cleanly without nicking internal copper conductors.',
      },
    ],
    materials: [
      {
        name: 'Electrical tape',
        reason: 'Provides dielectric insulation over repaired and spliced wire joints.',
      },
      {
        name: 'Wire connectors',
        reason: 'Ensures mechanical rigidity and electrical safety on cable terminations.',
      },
      {
        name: 'Suitable replacement wire',
        reason: 'FR/FRLS copper electrical wire of correct gauge to replace scorched wiring.',
      },
    ],
    safetyNote: 'Never bypass an MCB or safety trip switch with unrated jumper wire.',
  },
  {
    id: 'electrical_inspection',
    category: 'electrical',
    keywords: [
      'photo',
      'inspection',
      'inspect',
      'visual',
      'checkup',
      'diagnosis',
      'diagnostic',
      'assessment',
      'general',
      'repair',
      'electrical issue',
      'wiring issue',
    ],
    tools: [
      {
        name: 'Multimeter',
        reason: 'Tests line voltage, continuity, and resistance across circuits to detect electrical faults.',
      },
      {
        name: 'Voltage tester',
        reason: 'Non-contact voltage detector to scan cables and verify de-energization.',
      },
      {
        name: 'Screwdriver set',
        reason: 'Insulated screwdrivers for opening switchboards, junction boxes, and access covers.',
      },
    ],
    materials: [
      {
        name: 'Electrical tape',
        reason: 'High-grade PVC insulation tape to insulate exposed wire splices and terminals.',
      },
      {
        name: 'Wire connectors',
        reason: 'Twist-on wire nuts or terminal blocks for secure, fire-safe wire joints.',
      },
      {
        name: 'Replacement fuse',
        reason: 'Standard replacement fuses and links for circuit protection.',
      },
    ],
    safetyNote: 'Shut off the main MCB breaker before touching or inspecting any electrical wiring.',
  },

  // ---------------------------------------------------------------------------
  // 3. CARPENTRY
  // ---------------------------------------------------------------------------
  {
    id: 'carpentry_door',
    category: 'carpentry',
    keywords: [
      'carpenter',
      'carpentry',
      'wood',
      'door',
      'hinge',
      'hinges',
      'latch',
      'door lock',
      'door sticking',
      'creaking door',
      'lock',
      'handle',
      'door frame',
    ],
    tools: [
      {
        name: 'Screwdriver set',
        reason: 'For adjusting, tightening, or replacing hinge screws and latch plates.',
      },
      {
        name: 'Drill',
        reason: 'For pilot holes, mortising adjustments, and driving heavy screw anchors into door frames.',
      },
      {
        name: 'Measuring tape',
        reason: 'Accurately measures door clearances, gap alignment, and hinge placement.',
      },
    ],
    materials: [
      {
        name: 'Screws',
        reason: 'Heavy-duty wood screws to secure hinges firmly into door framing.',
      },
      {
        name: 'Hinges',
        reason: 'Replaces bent, squeaking, or rusted door hinges.',
      },
      {
        name: 'Wood filler',
        reason: 'Fills stripped screw holes and damaged wood surrounding hinge mortises.',
      },
    ],
    safetyNote: 'Support door weight with wedges during hinge removal to avoid strain or injury.',
  },
  {
    id: 'carpentry_furniture',
    category: 'carpentry',
    keywords: [
      'furniture',
      'chair',
      'table',
      'bed',
      'wardrobe',
      'cabinet',
      'drawer',
      'shelf',
      'wood repair',
      'wobbly',
      'broken leg',
    ],
    tools: [
      {
        name: 'Screwdriver set',
        reason: 'For tightening wobbly chair/table legs, hardware brackets, and fasteners.',
      },
      {
        name: 'Drill',
        reason: 'Bores clean screw pockets or dowel channels in damaged wood joints.',
      },
      {
        name: 'Measuring tape',
        reason: 'Verifies structural squareness, component leveling, and replacement dimensions.',
      },
    ],
    materials: [
      {
        name: 'Wood screws',
        reason: 'Countersunk wood fasteners for sturdy structural re-attachment.',
      },
      {
        name: 'Wood glue',
        reason: 'High-strength PVA adhesive to re-bond loose joinery and dowels.',
      },
      {
        name: 'Wood filler',
        reason: 'Levels cracks, gouges, and screw heads before final sanding.',
      },
    ],
    safetyNote: 'Allow bonded joints to cure under clamp pressure for proper tensile strength.',
  },
  {
    id: 'carpentry_inspection',
    category: 'carpentry',
    keywords: [
      'photo',
      'inspection',
      'inspect',
      'visual',
      'checkup',
      'diagnosis',
      'diagnostic',
      'assessment',
      'general',
      'repair',
      'woodwork',
      'carpentry issue',
    ],
    tools: [
      {
        name: 'Screwdriver set',
        reason: 'For adjusting, tightening, or disassembling hardware, brackets, and fixtures.',
      },
      {
        name: 'Drill',
        reason: 'For pilot holes and driving screw fasteners into wood or masonry framing.',
      },
      {
        name: 'Measuring tape',
        reason: 'Accurately measures clearances, gaps, and structural alignment.',
      },
    ],
    materials: [
      {
        name: 'Wood screws',
        reason: 'Multi-length wood fasteners for securing hinges, brackets, and framing.',
      },
      {
        name: 'Wood glue',
        reason: 'High-strength PVA adhesive to re-bond loose joinery and wood dowels.',
      },
      {
        name: 'Wood filler',
        reason: 'Levels cracks, gouges, and screw holes before final smoothing.',
      },
    ],
    safetyNote: 'Wear eye protection and work gloves when using power drills, saws, or sharp wood chisels.',
  },

  // ---------------------------------------------------------------------------
  // 4. PAINTING
  // ---------------------------------------------------------------------------
  {
    id: 'painting_wall',
    category: 'painting',
    keywords: [
      'paint',
      'painting',
      'paint house',
      'paint home',
      'paint room',
      'paint fully',
      'house painting',
      'home painting',
      'wall painting',
      'interior painting',
      'exterior painting',
      'repaint',
      'repainting',
      'wall color',
      'ceiling paint',
      'primer',
      'whitewash',
      'distemper',
      'emulsion',
      'house paint',
      'room painting',
      'full house',
    ],
    tools: [
      {
        name: 'Paint roller',
        reason: 'Evenly applies broad base coats across wide interior/exterior wall surfaces.',
      },
      {
        name: 'Paint brush',
        reason: 'Cuts in cleanly along wall edges, baseboards, door frames, and corners.',
      },
      {
        name: 'Scraper',
        reason: 'Removes flaking surface particles and flattens irregularities prior to coating.',
      },
    ],
    materials: [
      {
        name: 'Wall primer',
        reason: 'Prepares drywall or masonry surface for uniform topcoat adhesion and sheen.',
      },
      {
        name: 'Paint',
        reason: 'High-coverage washable emulsion paint for durable, vibrant wall finish.',
      },
      {
        name: 'Masking tape',
        reason: 'Protects trims, electrical switch plates, and adjoining edges from splatter.',
      },
      {
        name: 'Sandpaper',
        reason: 'Grades of 120/180 grit to smoothen wall patches and ensure mechanical keying.',
      },
    ],
    safetyNote: 'Cover flooring with drop cloths and isolate wall switches before applying wet paint.',
  },
  {
    id: 'painting_peeling',
    category: 'painting',
    keywords: [
      'peeling',
      'cracked',
      'peeling paint',
      'flaking',
      'crack',
      'dampness patch',
      'chipped paint',
      'bubbling',
    ],
    tools: [
      {
        name: 'Scraper',
        reason: 'Pares away loose, bubbling, or cracked paint films back to sound substrate.',
      },
      {
        name: 'Putty knife',
        reason: 'Spreads and levels wall filler/putty flush with surrounding drywall.',
      },
      {
        name: 'Sanding block',
        reason: 'Evenly flattens dried putty repairs without creating hollow depressions.',
      },
    ],
    materials: [
      {
        name: 'Wall putty',
        reason: 'Acrylic or polymer-based compound that fills cracks, pits, and peeling hollows.',
      },
      {
        name: 'Primer',
        reason: 'Penetrating sealer that seals repaired putty spots to prevent flash-marking.',
      },
      {
        name: 'Paint',
        reason: 'Touch-up or full finish coat to blend patched areas into surrounding decor.',
      },
    ],
    safetyNote: 'Wear an N95 dust mask when scraping and dry-sanding old paint films.',
  },
  {
    id: 'painting_inspection',
    category: 'painting',
    keywords: [
      'photo',
      'inspection',
      'inspect',
      'visual',
      'checkup',
      'diagnosis',
      'diagnostic',
      'assessment',
      'general',
      'repair',
      'touchup',
      'painting issue',
    ],
    tools: [
      {
        name: 'Paint roller',
        reason: 'Evenly applies broad base coats across wide interior/exterior wall surfaces.',
      },
      {
        name: 'Paint brush',
        reason: 'Cuts in cleanly along wall edges, trim detailing, and corner edging.',
      },
      {
        name: 'Scraper',
        reason: 'Pares away loose, bubbling, or cracked paint films back to sound substrate.',
      },
    ],
    materials: [
      {
        name: 'Paint',
        reason: 'High-coverage washable emulsion paint for durable, vibrant wall finish.',
      },
      {
        name: 'Wall primer',
        reason: 'Prepares drywall or masonry surface for uniform topcoat adhesion and sheen.',
      },
      {
        name: 'Wall putty',
        reason: 'Acrylic leveling compound that fills cracks, pits, and peeling hollows.',
      },
    ],
    safetyNote: 'Ensure adequate cross-ventilation in all working areas and wear a dust mask when sanding.',
  },

  // ---------------------------------------------------------------------------
  // 5. APPLIANCE REPAIR
  // ---------------------------------------------------------------------------
  {
    id: 'appliance_general',
    category: 'appliance_repair',
    keywords: [
      'appliance',
      'refrigerator',
      'fridge',
      'washing machine',
      'microwave',
      'oven',
      'mixer',
      'grinder',
      'appliance not working',
      'not heating',
      'not spinning',
      'dead appliance',
    ],
    tools: [
      {
        name: 'Multimeter',
        reason: 'Checks heating elements, fuses, relays, and motor windings for continuity and resistance.',
      },
      {
        name: 'Screwdriver set',
        reason: 'Specialized Torx, Phillips, and flat bits for disassembling chassis casings.',
      },
      {
        name: 'Voltage tester',
        reason: 'Confirms main socket supply and ensures internal capacitors are discharged.',
      },
    ],
    materials: [
      {
        name: 'Replacement fuse',
        reason: 'Thermal or ceramic surge fuse to replace blown circuit protection.',
      },
      {
        name: 'Electrical connectors',
        reason: 'Heat-resistant spade and push-on terminal clips for internal wiring harnesses.',
      },
      {
        name: 'Appropriate replacement component',
        reason: 'Replacement thermostat, relay, or switch matching appliance model specifications.',
      },
    ],
    safetyNote: 'Unplug the appliance cord from the wall outlet before opening internal compartments.',
  },
  {
    id: 'appliance_inspection',
    category: 'appliance_repair',
    keywords: [
      'photo',
      'inspection',
      'inspect',
      'visual',
      'checkup',
      'diagnosis',
      'diagnostic',
      'assessment',
      'general',
      'repair',
      'appliance issue',
    ],
    tools: [
      {
        name: 'Multimeter',
        reason: 'Checks heating elements, fuses, relays, and motor windings for continuity and resistance.',
      },
      {
        name: 'Screwdriver set',
        reason: 'Specialized Torx, Phillips, and flat bits for disassembling chassis casings.',
      },
      {
        name: 'Voltage tester',
        reason: 'Confirms main socket supply and ensures internal capacitors are discharged.',
      },
    ],
    materials: [
      {
        name: 'Replacement fuse',
        reason: 'Thermal or ceramic surge fuse to replace blown circuit protection.',
      },
      {
        name: 'Electrical connectors',
        reason: 'Heat-resistant spade and push-on terminal clips for internal wiring harnesses.',
      },
      {
        name: 'Electrical tape',
        reason: 'Insulates wire connections and internal harness splices against short circuits.',
      },
    ],
    safetyNote: 'Always unplug appliances from the wall outlet before removing panels or servicing internals.',
  },

  // ---------------------------------------------------------------------------
  // 6. AC SERVICING
  // ---------------------------------------------------------------------------
  {
    id: 'ac_cooling',
    category: 'ac_servicing',
    keywords: [
      'ac',
      'air conditioner',
      'servicing',
      'ac not cooling',
      'cooling',
      'gas',
      'refrigerant',
      'not cold',
      'compressor',
      'gas refill',
      'low cooling',
      'warm air',
    ],
    tools: [
      {
        name: 'Manifold gauge set',
        reason: 'Reads high-side and low-side refrigerant pressures to diagnose gas charge and compressor health.',
      },
      {
        name: 'Thermometer',
        reason: 'Measures evaporator coil intake vs. supply vent differential temperature (delta T).',
      },
      {
        name: 'Multimeter',
        reason: 'Verifies compressor run capacitor, fan motor, and contactor voltage draw.',
      },
    ],
    materials: [
      {
        name: 'Appropriate refrigerant',
        reason: 'Compatible R32, R410A, or R22 refrigerant for topping up depleted system charge.',
      },
      {
        name: 'Air filter',
        reason: 'Clean replacement filter mesh to restore blocked airflow across the cooling coil.',
      },
      {
        name: 'Insulation tape',
        reason: 'Thermal foam wrapping to prevent condensation on cold suction copper lines.',
      },
    ],
    safetyNote: 'Always switch off the outdoor unit isolator switch before connecting manifold hoses.',
  },
  {
    id: 'ac_leakage',
    category: 'ac_servicing',
    keywords: [
      'ac water leakage',
      'water dripping',
      'water leaking',
      'ac leak',
      'ac drip',
      'drain pipe',
      'indoor unit leaking',
    ],
    tools: [
      {
        name: 'Wet/dry vacuum',
        reason: 'Clears algae, slime, and trapped dust blockages out of the gravity drain pipe.',
      },
      {
        name: 'Drain cleaning tool',
        reason: 'Flexible nylon snake to route through indoor condensate tray outlets.',
      },
      {
        name: 'Screwdriver set',
        reason: 'Removes front decorative AC fascia and water collection tray clips.',
      },
    ],
    materials: [
      {
        name: 'Drain pipe/seal',
        reason: 'Replacement flexible corrugated condensate hose and leakproof clamp connectors.',
      },
      {
        name: 'Insulation tape',
        reason: 'Reseals cold drain connections to prevent secondary drip condensation.',
      },
    ],
    safetyNote: 'Disconnect unit power before removing plastic casings to prevent moisture-induced shorts.',
  },
  {
    id: 'ac_inspection',
    category: 'ac_servicing',
    keywords: [
      'photo',
      'inspection',
      'inspect',
      'visual',
      'checkup',
      'diagnosis',
      'diagnostic',
      'assessment',
      'general',
      'repair',
      'ac issue',
    ],
    tools: [
      {
        name: 'Manifold gauge set',
        reason: 'Reads high-side and low-side refrigerant pressures to diagnose gas charge and compressor health.',
      },
      {
        name: 'Thermometer',
        reason: 'Measures evaporator coil intake vs. supply vent differential temperature (delta T).',
      },
      {
        name: 'Multimeter',
        reason: 'Verifies compressor run capacitor, fan motor, and contactor voltage draw.',
      },
    ],
    materials: [
      {
        name: 'Appropriate refrigerant',
        reason: 'Compatible refrigerant for topping up depleted system charge if required.',
      },
      {
        name: 'Air filter',
        reason: 'Clean replacement filter mesh to restore blocked airflow across the cooling coil.',
      },
      {
        name: 'Insulation tape',
        reason: 'Thermal foam wrapping to prevent condensation on cold suction copper lines.',
      },
    ],
    safetyNote: 'Disconnect electrical isolator before servicing indoor or outdoor units.',
  },

  // ---------------------------------------------------------------------------
  // 7. CLEANING
  // ---------------------------------------------------------------------------
  {
    id: 'cleaning_deep',
    category: 'cleaning',
    keywords: [
      'deep cleaning',
      'cleaning',
      'clean',
      'sanitization',
      'sanitize',
      'dusting',
      'kitchen cleaning',
      'bathroom cleaning',
      'stain',
      'grout',
      'scrub',
    ],
    tools: [
      {
        name: 'Vacuum cleaner',
        reason: 'HEPA-filter vacuum for thorough extraction of loose dust, cobwebs, and grit.',
      },
      {
        name: 'Scrub brush',
        reason: 'Stiff and medium bristle brushes for dislodging tile grout scum and grime.',
      },
      {
        name: 'Microfiber cloth',
        reason: 'Lint-free cloths for streak-free wiping, glass polishing, and dusting.',
      },
    ],
    materials: [
      {
        name: 'Appropriate surface cleaner',
        reason: 'Non-abrasive multi-surface cleaner for countertops, tiles, and fixtures.',
      },
      {
        name: 'Disinfectant',
        reason: 'Antibacterial sanitizing solution for hygienic pathogen eradication.',
      },
      {
        name: 'Gloves',
        reason: 'Heavy-duty nitrile/rubber gloves to protect hands from chemical irritants.',
      },
    ],
    safetyNote: 'Ensure good ventilation when using chemical disinfectants and never mix bleach with acids.',
  },
  {
    id: 'cleaning_inspection',
    category: 'cleaning',
    keywords: [
      'photo',
      'inspection',
      'inspect',
      'visual',
      'checkup',
      'diagnosis',
      'diagnostic',
      'assessment',
      'general',
      'cleaning issue',
    ],
    tools: [
      {
        name: 'Vacuum cleaner',
        reason: 'HEPA-filter vacuum for thorough extraction of loose dust, cobwebs, and grit.',
      },
      {
        name: 'Scrub brush',
        reason: 'Stiff and medium bristle brushes for dislodging tile grout scum and grime.',
      },
      {
        name: 'Microfiber cloth',
        reason: 'Lint-free cloths for streak-free wiping, glass polishing, and dusting.',
      },
    ],
    materials: [
      {
        name: 'Appropriate surface cleaner',
        reason: 'Non-abrasive multi-surface cleaner for countertops, tiles, and fixtures.',
      },
      {
        name: 'Disinfectant',
        reason: 'Antibacterial sanitizing solution for hygienic pathogen eradication.',
      },
      {
        name: 'Gloves',
        reason: 'Heavy-duty nitrile/rubber gloves to protect hands from chemical irritants.',
      },
    ],
    safetyNote: 'Ensure good ventilation when using chemical disinfectants and never mix bleach with acids.',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalizes text: trims, lowercases, strips special characters, normalizes spaces
 */
export function normalizeText(text) {
  if (text == null) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves standard category key from service name, ID, or raw category string.
 * Supports: plumbing, electrical, carpentry, painting, appliance_repair, ac_servicing, cleaning.
 */
export function resolveCategory(categoryInput) {
  if (!categoryInput) return null;

  const raw = String(categoryInput).toLowerCase().trim();

  // Explicit category identifiers
  if (raw === 'plumbing' || raw.includes('plumb')) return 'plumbing';
  if (raw === 'electrical' || raw.includes('electr')) return 'electrical';
  if (raw === 'carpentry' || raw.includes('carpen')) return 'carpentry';
  if (raw === 'painting' || raw.includes('paint')) return 'painting';
  if (raw === 'cleaning' || raw.includes('clean')) return 'cleaning';

  // Specific AC or Appliance identifiers
  if (raw === 'ac servicing' || raw === 'ac_servicing' || raw === 'ac' || raw.includes('air cond')) {
    return 'ac_servicing';
  }
  if (
    raw === 'appliance repair' ||
    raw === 'appliance_repair' ||
    raw === 'appliance' ||
    raw.includes('appliance')
  ) {
    return 'appliance_repair';
  }

  // Combined AC & Appliance Repair (Service ID 4 in HOMEFIX)
  if (raw.includes('ac & appliance') || raw.includes('ac and appliance') || raw === '4') {
    return 'ac_and_appliance';
  }

  // Numeric service ID fallbacks
  if (raw === '1') return 'electrical';
  if (raw === '2') return 'plumbing';
  if (raw === '3') return 'carpentry';
  if (raw === '5') return 'painting';
  if (raw === '6') return 'cleaning';

  return null;
}

/**
 * Checks whether text contains keyword using word boundary safety
 */
function textContainsKeyword(normalizedText, keyword) {
  const normKeyword = normalizeText(keyword);
  if (!normKeyword) return false;

  // Use regex with word boundaries where practical
  const escaped = normKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');
  return regex.test(normalizedText);
}

// =============================================================================
// MAIN RECOMMENDATION ENGINE FUNCTION
// =============================================================================

/**
 * Generates rule-based recommendations for tools and materials.
 *
 * Accepts either:
 * - Single config object: { category, title, description, serviceName, serviceId }
 * - Positional arguments: (category, title, description)
 *
 * @returns {Object} {
 *   success: true,
 *   category: string,
 *   matched: boolean,
 *   matchedKeywords: string[],
 *   tools: Array<{ name: string, reason: string }>,
 *   materials: Array<{ name: string, reason: string }>,
 *   safetyGuideline: string,
 *   message: string
 * }
 */
export function getToolMaterialRecommendations(arg1, arg2, arg3) {
  let categoryInput;
  let titleInput = '';
  let descriptionInput = '';

  if (typeof arg1 === 'object' && arg1 !== null) {
    categoryInput = arg1.category || arg1.serviceName || arg1.service_name || arg1.serviceId || arg1.service_id;
    titleInput = arg1.title || arg1.problem_title || '';
    descriptionInput = arg1.description || arg1.problem_description || '';
  } else {
    categoryInput = arg1;
    titleInput = arg2 || '';
    descriptionInput = arg3 || '';
  }

  const resolvedCat = resolveCategory(categoryInput);

  // If completely unknown category
  if (!resolvedCat) {
    return {
      success: true,
      category: 'unknown',
      matched: false,
      matchedKeywords: [],
      tools: [],
      materials: [],
      safetyGuideline: null,
      message: 'Unknown or unsupported service category. Please verify category.',
    };
  }

  const combinedText = normalizeText(`${titleInput} ${descriptionInput}`);

  // Determine candidate categories to search
  const categoriesToSearch =
    resolvedCat === 'ac_and_appliance'
      ? ['ac_servicing', 'appliance_repair']
      : [resolvedCat];

  const candidateRules = RECOMMENDATION_RULES.filter((rule) =>
    categoriesToSearch.includes(rule.category)
  );

  const matchedRules = [];
  const matchedKeywords = [];

  for (const rule of candidateRules) {
    for (const kw of rule.keywords) {
      if (textContainsKeyword(combinedText, kw)) {
        if (!matchedRules.some((r) => r.id === rule.id)) {
          matchedRules.push(rule);
        }
        if (!matchedKeywords.includes(kw)) {
          matchedKeywords.push(kw);
        }
      }
    }
  }

  // Handle no match scenario
  if (matchedRules.length === 0) {
    const defaultSafety =
      SAFETY_GUIDELINES[resolvedCat] ||
      (resolvedCat === 'ac_and_appliance' ? SAFETY_GUIDELINES.ac_servicing : null);

    return {
      success: true,
      category: resolvedCat,
      matched: false,
      matchedKeywords: [],
      tools: [],
      materials: [],
      safetyGuideline: defaultSafety,
      message: 'No specific tool/material rules matched this complaint. Standard on-site inspection recommended.',
    };
  }

  // Deduplicate tools and materials while aggregating
  const toolMap = new Map();
  const materialMap = new Map();

  for (const rule of matchedRules) {
    for (const tool of rule.tools) {
      const key = tool.name.toLowerCase().trim();
      if (!toolMap.has(key)) {
        toolMap.set(key, { name: tool.name, reason: tool.reason });
      }
    }
    for (const mat of rule.materials) {
      const key = mat.name.toLowerCase().trim();
      if (!materialMap.has(key)) {
        materialMap.set(key, { name: mat.name, reason: mat.reason });
      }
    }
  }

  const tools = Array.from(toolMap.values());
  const materials = Array.from(materialMap.values());

  // Determine primary safety guideline
  let primarySafety =
    SAFETY_GUIDELINES[resolvedCat] ||
    (resolvedCat === 'ac_and_appliance' ? SAFETY_GUIDELINES.ac_servicing : null);

  // If specific matched rule has a safety note, prepend or use it
  const specificNotes = matchedRules.map((r) => r.safetyNote).filter(Boolean);
  if (specificNotes.length > 0) {
    primarySafety = `${specificNotes[0]} ${primarySafety ? `Note: ${primarySafety}` : ''}`.trim();
  }

  return {
    success: true,
    category: resolvedCat,
    matched: true,
    matchedKeywords,
    tools,
    materials,
    safetyGuideline: primarySafety,
    message: `Matched ${tools.length} recommended tool(s) and ${materials.length} material(s).`,
  };
}

export default {
  getToolMaterialRecommendations,
  normalizeText,
  resolveCategory,
  RECOMMENDATION_RULES,
  SAFETY_GUIDELINES,
};
