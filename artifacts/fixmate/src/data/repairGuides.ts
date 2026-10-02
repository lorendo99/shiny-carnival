export type RepairGuide = {
  slug: string;
  itemType: string;
  symptom: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  intro: string;
  causes: string[];
  safeSteps: string[];
  warning: string;
};

export const repairGuides: RepairGuide[] = [
  {
    slug: 'dishwasher-not-draining',
    itemType: 'Dishwasher',
    symptom: 'My dishwasher is not draining.',
    title: 'Dishwasher Not Draining? Safe Checks and Next Steps | FixMate',
    metaDescription: 'Find out why your dishwasher may not be draining, which safe checks to try, and when to find a local repairer with FixMate.',
    eyebrow: 'Dishwasher repair guide',
    heading: 'Dishwasher not draining?',
    intro: 'A dishwasher that leaves water behind may have a blocked filter, drain path, or pump. Start with safe checks before deciding whether you need a part or a repairer.',
    causes: ['Blocked filter or sump area', 'Kinked or restricted drain hose', 'Drain pump obstruction or failure'],
    safeSteps: ['Switch the dishwasher off before checking inside it.', 'Remove standing water carefully and inspect the filter for food or glass.', 'Do not reach into a pump area if you can see broken glass or anything unsafe.'],
    warning: 'If there is an electrical smell, leaking near a socket, or broken glass, stop and use a qualified professional.',
  },
  {
    slug: 'refrigerator-making-noise',
    itemType: 'Refrigerator',
    symptom: 'My refrigerator is making an unusual noise.',
    title: 'Refrigerator Making Noise? Likely Causes and Safe Checks | FixMate',
    metaDescription: 'Understand common refrigerator noises, safe checks to try, and when to get a local repairer with FixMate.',
    eyebrow: 'Refrigerator repair guide',
    heading: 'Refrigerator making a strange noise?',
    intro: 'A hum, rattle, click, or buzz can come from normal cooling cycles, vibration, a fan, or a component that needs attention. The sound and when it happens are useful clues.',
    causes: ['The appliance or a nearby item is vibrating', 'A fan is catching ice or debris', 'The compressor or start components need inspection'],
    safeSteps: ['Note whether the noise happens during cooling, defrosting, or when the door closes.', 'Check that the refrigerator is level and not touching the wall.', 'Keep the doors closed if food temperature is at risk while you arrange help.'],
    warning: 'Do not remove electrical covers or work near refrigerant components. Use a qualified appliance professional for those checks.',
  },
  {
    slug: 'washing-machine-leaking',
    itemType: 'Washing machine',
    symptom: 'My washing machine is leaking.',
    title: 'Washing Machine Leaking? Safe Checks and Repair Options | FixMate',
    metaDescription: 'Learn why a washing machine may be leaking, what to check safely, and when to find a local repairer with FixMate.',
    eyebrow: 'Washing machine repair guide',
    heading: 'Washing machine leaking?',
    intro: 'The location and timing of the water usually narrow this down: inlet hose, door seal, detergent drawer, drain hose, or a leak underneath.',
    causes: ['Loose or damaged inlet or drain hose', 'Worn door seal or blocked dispenser', 'A pump or internal hose leak'],
    safeSteps: ['Stop the cycle and switch off the water supply if it is safe to reach.', 'Unplug the machine only if the plug and socket are dry and safe to access.', 'Take a photo of where the water first appears before moving the appliance.'],
    warning: 'If water is near a socket, the floor is flooded, or the machine smells of burning, keep clear and get urgent professional help.',
  },
  {
    slug: 'boiler-pressure-problem',
    itemType: 'Something else',
    symptom: 'My boiler has a pressure problem.',
    title: 'Boiler Pressure Problem? Safe Guidance for the Next Step | FixMate',
    metaDescription: 'Get clear guidance for a boiler pressure problem, what information to record, and when to contact a qualified heating professional.',
    eyebrow: 'Boiler repair guide',
    heading: 'Boiler pressure problem?',
    intro: 'Low or rising boiler pressure can have different causes, and gas appliances need extra care. FixMate can help you organise the clues before you contact a qualified professional.',
    causes: ['Pressure has dropped after bleeding a radiator', 'A leak is reducing system pressure', 'The pressure is rising or falling because of a component fault'],
    safeSteps: ['Read the pressure display without removing the boiler cover.', 'Note whether the pressure changes when the heating is on or off.', 'Check visible pipework for water without touching hot surfaces or gas components.'],
    warning: 'Never remove a boiler cover or work on gas components. If you smell gas, leave the area and call the appropriate emergency service.',
  },
  {
    slug: 'oven-not-heating',
    itemType: 'Oven or stove',
    symptom: 'My oven is not heating.',
    title: 'Oven Not Heating? Safe Checks and Repair Options | FixMate',
    metaDescription: 'Find likely causes of an oven that is not heating, safe information to collect, and when to use a local repairer with FixMate.',
    eyebrow: 'Oven repair guide',
    heading: 'Oven not heating?',
    intro: 'An oven that stays cold may have a failed heating element, thermostat, timer setting, or power issue. Record what still works before arranging a repair.',
    causes: ['A heating element has failed', 'The timer or heating mode is set incorrectly', 'A fuse, thermostat, or control component needs inspection'],
    safeSteps: ['Check the selected heating mode and timer without touching hot parts.', 'See whether the hob, display, or light still works.', 'Switch the oven off before inspecting anything further.'],
    warning: 'Do not remove covers or test live electrical parts. A qualified appliance professional should handle electrical repairs.',
  },
];

export function getRepairGuide(slug: string | null | undefined): RepairGuide | null {
  return repairGuides.find((guide) => guide.slug === slug) ?? null;
}