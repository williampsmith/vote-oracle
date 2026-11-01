/**
 * The swipe deck. Every user sees the same questions in the same order.
 *
 * Swipe right = "Yeah" (agree), left = "Nah" (disagree), up = "Not sure" (skip).
 * `w` holds the signed contribution to each value axis when the user AGREES.
 * Disagreeing applies the negative (scaled by DISAGREE_FACTOR); skipping applies nothing.
 *
 * Axis polarity (negative ← → positive):
 *   econ        Markets & self-reliance  ←→  Public investment & safety nets
 *   social      Tradition & continuity   ←→  Change & inclusion
 *   safety      Enforcement & order      ←→  Reform & rehabilitation
 *   climate     Affordability first      ←→  Climate first
 *   housing     Neighborhood control     ←→  Build more, faster
 *   immigration Enforcement & limits     ←→  Welcome & integration
 *   governance  Steady & experienced     ←→  Shake up the system
 *   pragmatism  Vote my conscience       ←→  Vote to win
 */

export const AXES = [
  "econ",
  "social",
  "safety",
  "climate",
  "housing",
  "immigration",
  "governance",
  "pragmatism",
] as const;

export type Axis = (typeof AXES)[number];

export const AXIS_META: Record<
  Axis,
  { label: string; neg: string; pos: string; blurb: string }
> = {
  econ: {
    label: "Economy",
    neg: "Free markets",
    pos: "Public investment",
    blurb: "How much you lean on markets vs. government to deliver a fair economy.",
  },
  social: {
    label: "Culture",
    neg: "Tradition",
    pos: "Change",
    blurb: "Whether you prize continuity and tradition or social change and inclusion.",
  },
  safety: {
    label: "Public safety",
    neg: "Enforcement",
    pos: "Reform",
    blurb: "Tough-on-crime enforcement vs. prevention, treatment and second chances.",
  },
  climate: {
    label: "Energy & climate",
    neg: "Affordability",
    pos: "Climate action",
    blurb: "Keeping energy cheap and jobs steady vs. moving fast on climate.",
  },
  housing: {
    label: "Housing",
    neg: "Local control",
    pos: "Build more",
    blurb: "Neighborhood say over growth vs. building lots more housing, fast.",
  },
  immigration: {
    label: "Immigration",
    neg: "Enforcement",
    pos: "Inclusion",
    blurb: "Border control and cooperation with federal enforcement vs. welcome and integration.",
  },
  governance: {
    label: "Leadership style",
    neg: "Experienced insiders",
    pos: "Outsiders & disruptors",
    blurb: "Trust in seasoned institutions vs. appetite for shaking things up.",
  },
  pragmatism: {
    label: "Voting strategy",
    neg: "Pure conviction",
    pos: "Pragmatic",
    blurb: "Voting your ideals no matter what vs. picking the best viable option.",
  },
};

export const DISAGREE_FACTOR = 0.85;

export type Question = {
  id: string;
  text: string;
  /** Optional small context line under the statement. */
  hint?: string;
  /** Background image under /public/questions/<id>.webp */
  image: string;
  /** Prompt used to generate the background image (kept for reproducibility). */
  imagePrompt: string;
  w: Partial<Record<Axis, number>>;
};

const q = (
  id: string,
  text: string,
  w: Question["w"],
  imagePrompt: string,
  hint?: string,
): Question => ({ id, text, w, imagePrompt, hint, image: `/questions/${id}.webp` });

export const QUESTIONS: Question[] = [
  q(
    "bakery-teen",
    "A family bakery should be able to pay a first-job teenager a bit under minimum wage while they learn.",
    { econ: -1 },
    "warm early-morning interior of a small family bakery, flour dust in golden window light, trays of bread, apron hanging on a hook",
  ),
  q(
    "lesser-evil",
    "Voting for the lesser of two evils is still voting for evil.",
    { pragmatism: -1 },
    "a fork in a dusty desert road at dusk, two paths diverging into hazy distance, moody sky",
  ),
  q(
    "train-station-apartments",
    "A six-story apartment building next to the train station, in a neighborhood of single-family homes? Build it.",
    { housing: 1 },
    "a commuter train platform at golden hour beside a quiet street of california bungalows, construction crane in the distance",
  ),
  q(
    "gas-30-cents",
    "I'd pay 30 cents more per gallon if it meant noticeably cleaner air where I live.",
    { climate: 1 },
    "a gas station price sign at sunset with smoggy los angeles skyline fading into clear blue sky, cinematic",
  ),
  q(
    "grew-up-here",
    "Someone who was brought across the border as a child and grew up here is as Californian as anyone.",
    { immigration: 1 },
    "a young adult in a graduation gown seen from behind looking at a california hillside at sunset, no face visible",
  ),
  q(
    "900-felony",
    "Stealing $900 worth of goods should be a felony, not a misdemeanor.",
    { safety: -1 },
    "a retail store aisle at night with shelves of products behind locked plexiglass cases, fluorescent light",
  ),
  q(
    "career-politicians",
    "Politicians who've spent decades in Sacramento know how to actually get things done.",
    { governance: -1 },
    "the california state capitol dome in sacramento at blue hour, long exposure, warm lights",
  ),
  q(
    "two-moms",
    "Elementary schools should include books showing all kinds of families — including kids with two moms or two dads.",
    { social: 1 },
    "a bright elementary school classroom reading corner with colorful picture books on low shelves and beanbags, soft daylight",
  ),
  q(
    "billionaire-earned",
    "A founder who built a company from nothing and became a billionaire earned every dollar of it.",
    { econ: -1 },
    "a modest suburban garage converted into a startup workshop at night, desk lamp, circuit boards and a whiteboard",
  ),
  q(
    "never-held-office",
    "I'd rather vote for someone who has never held office than a career politician.",
    { governance: 1 },
    "a lone folding chair at an empty town hall podium with an american flag, dramatic side light",
  ),
  q(
    "mental-health-911",
    "Sending a trained mental-health responder instead of police to some 911 calls is a smart idea.",
    { safety: 0.8, econ: 0.2 },
    "a calm city street at dusk with a white crisis response van parked under a streetlight, rain-slick pavement",
  ),
  q(
    "parents-notified",
    "Parents should be told if their child starts going by a different name or pronouns at school.",
    { social: -1 },
    "a school hallway with lockers and a backpack on the floor, late afternoon sunlight streaming through windows",
  ),
  q(
    "nuclear-plant",
    "California should keep its last nuclear power plant running well past its planned shutdown.",
    { pragmatism: 0.5, climate: 0.2, econ: -0.2 },
    "diablo canyon style coastal nuclear power plant domes on rugged california cliffs above the pacific, misty morning",
  ),
  q(
    "60-percent",
    "A candidate who agrees with me 60% of the time and can win beats one who agrees 100% but can't.",
    { pragmatism: 1 },
    "a chess board mid-game in soft window light, a hand hovering over a pawn, shallow depth of field",
  ),
  q(
    "local-police-ice",
    "If federal immigration agents ask, local police should hand over people already in their custody.",
    { immigration: -1, safety: -0.3 },
    "a county jail exterior at dawn with a chain link fence and long shadows, muted tones",
  ),
  q(
    "neighbors-block",
    "Neighbors should have real power to block projects that would change the character of their street.",
    { housing: -1, governance: -0.2 },
    "a charming tree-lined california residential street with craftsman houses and a lawn sign, golden afternoon",
  ),
  q(
    "church-replace",
    "A society that drifts away from religion loses something it can't easily replace.",
    { social: -1 },
    "an old california mission church with adobe walls and a bell tower at sunset, warm light",
  ),
  q(
    "gas-cars-2035",
    "Phasing out new gas-car sales by 2035 is moving too fast for regular working people.",
    { climate: -1 },
    "a row of cars in traffic on a california freeway at sunset, one electric car charging at a roadside station",
  ),
  q(
    "bail-poor",
    "Cash bail mostly punishes people for being poor, not for being dangerous.",
    { safety: 1, econ: 0.2 },
    "the steps of a courthouse in morning light with a single person sitting on the steps, seen from far away",
  ),
  q(
    "unions-middle-class",
    "Labor unions are a big part of why there's a middle class at all.",
    { econ: 1 },
    "dockworkers silhouetted against giant cranes at the port of oakland at sunrise",
  ),
  q(
    "compromise-dies",
    "Compromise is where good ideas go to die.",
    { pragmatism: -1, governance: 0.3 },
    "two hands about to shake across a table, tense mood, dramatic chiaroscuro light",
  ),
  q(
    "encampment-shelter",
    "People living in encampments should have to accept shelter when it's offered — or move along.",
    { safety: -1, social: -0.2 },
    "tents beneath a freeway overpass at dawn, soft fog, respectful documentary photography, no visible faces",
  ),
  q(
    "school-dollars",
    "Families should be able to take their child's share of public school funding to a private or charter school.",
    { econ: -0.7, social: -0.4 },
    "a school bus stopped at a fork between a public school building and a small private school with a bell, morning",
  ),
  q(
    "health-regardless",
    "State-funded health coverage should be available to adults regardless of immigration status.",
    { immigration: 1, econ: 0.5 },
    "a community health clinic waiting room with empty chairs, plants, and warm daylight",
  ),
  q(
    "electric-bill",
    "Honestly, my electricity bill worries me more than climate change does.",
    { climate: -1, econ: -0.2 },
    "a kitchen table with a utility bill envelope beside a coffee mug and a calculator, soft morning light",
  ),
  q(
    "twenty-years",
    "Someone who has served 20 years for a crime they committed at 18 is probably a different person now.",
    { safety: 1 },
    "a prison yard fence with an open gate leading to a long road and open sky, hopeful sunrise",
  ),
  q(
    "ballot-measures",
    "Voters, not legislators, should decide big issues directly through ballot measures.",
    { governance: 0.7 },
    "a hand dropping a ballot into a mail drop box on a sunny california street corner",
  ),
  q(
    "refinery-profits",
    "When gas prices spike, the state should be able to cap oil refiners' profits.",
    { econ: 1, climate: 0.3 },
    "an oil refinery in the bay area at dusk, flare stacks glowing, dramatic orange sky",
  ),
  q(
    "leave-blank",
    "I'd leave a race blank before I'd vote for someone I don't believe in.",
    { pragmatism: -0.8 },
    "a paper ballot with one empty unfilled bubble, pen resting beside it, macro photography",
  ),
  q(
    "shelter-nearby",
    "I'd be okay with a homeless shelter opening a few blocks from my home.",
    { housing: 0.6, safety: 0.5, social: 0.2 },
    "a newly built modular housing complex with small gardens on a quiet city block at golden hour",
  ),
  q(
    "border-country",
    "A country that can't control who enters isn't fully a country.",
    { immigration: -1 },
    "a long border fence stretching across desert hills toward the pacific ocean at sunset",
  ),
  q(
    "gig-contractor",
    "A rideshare driver should be able to stay an independent contractor, even if it means fewer benefits.",
    { econ: -0.8 },
    "a rideshare car interior at night with the city lights of san francisco reflected in the windshield",
  ),
  q(
    "old-traditions",
    "Some traditions people now call outdated were quietly holding communities together.",
    { social: -0.8 },
    "a small-town fourth of july parade on a main street with bunting and old storefronts, nostalgic film look",
  ),
  q(
    "incremental",
    "Big problems usually need patient, step-by-step fixes — not tearing the system down.",
    { governance: -1, pragmatism: 0.4 },
    "stone bridge under construction with scaffolding over a river, careful craftsmanship, morning mist",
  ),
  q(
    "farm-water",
    "In a drought, water for farms should come before water for fish and rivers.",
    { climate: -0.8, econ: -0.2 },
    "central valley almond orchard with irrigation canal beside a dry cracked riverbed, harsh midday sun",
  ),
  q(
    "ceqa-block",
    "Environmental reviews have become a tool to block housing more than to protect nature.",
    { housing: 1, governance: 0.2, climate: -0.2 },
    "a stack of thick bound documents on a desk next to architectural blueprints and a hard hat",
  ),
  q(
    "immigrant-workers",
    "California's farms and kitchens would fall apart without immigrant workers — documented or not.",
    { immigration: 0.7, econ: 0.1 },
    "farmworkers in straw hats harvesting strawberries in salinas valley fields at dawn, seen from a distance",
  ),
  q(
    "more-police",
    "I'd feel safer with more police officers walking the streets of my neighborhood.",
    { safety: -1 },
    "a neighborhood commercial street in the evening with warm shop lights and a distant police patrol car",
  ),
  q(
    "personal-decisions",
    "Some decisions are so personal that the law shouldn't touch them — even ones I'd make differently.",
    { social: 0.8, governance: 0.1 },
    "a closed wooden door with soft light spilling from underneath, quiet and private mood",
  ),
  q(
    "teachers-unions",
    "Teachers' unions have too much say in how public schools are run.",
    { econ: -0.6, social: -0.3, governance: 0.2 },
    "an empty school board meeting room with rows of chairs and microphones, fluorescent light",
  ),
  q(
    "national-politics",
    "California's leaders care more about national politics than fixing things at home.",
    { governance: 0.7, social: -0.2 },
    "a pothole filled with rainwater reflecting a billboard and palm trees, gritty street photography",
  ),
  q(
    "experts-trust",
    "I trust independent experts more than elected officials to make complicated policy.",
    { governance: -0.4, social: 0.2 },
    "a scientist's lab bench with microscopes and notebooks, cool blue light, bokeh",
  ),
  q(
    "home-gun",
    "Keeping a gun at home for protection is a reasonable choice for an ordinary family.",
    { safety: -0.6, social: -0.6 },
    "a quiet rural california ranch house porch at dusk with a porch light on, long shadows",
  ),
  q(
    "regulations-hurt",
    "Most regulations exist because somebody, somewhere, got hurt.",
    { econ: 0.8, governance: -0.2 },
    "a construction site safety sign and hard hats hanging on a fence, overcast light",
  ),
  q(
    "kern-oil-jobs",
    "Oil-field jobs in Kern County are worth protecting even as the state shifts to clean energy.",
    { climate: -0.8, econ: -0.1 },
    "oil pumpjacks among golden hills in kern county at sunset, wind turbines on a distant ridge",
  ),
  q(
    "rent-control",
    "Rent control helps more people than it hurts.",
    { econ: 0.8, housing: -0.3 },
    "a row of colorful stacked apartment buildings with laundry on balconies, late afternoon light",
  ),
  q(
    "reparations-study",
    "Reparations for descendants of enslaved people deserve serious consideration.",
    { social: 1 },
    "an old historical archive with stacks of records, documents and photographs on a wooden table, dust in sunlight",
  ),
  q(
    "athletes-sex",
    "In school sports, athletes should compete in the category that matches their sex at birth.",
    { social: -1 },
    "an empty high school track at sunrise with starting blocks on the line, dew on the grass",
  ),
  q(
    "competence-over-side",
    "A candidate's competence matters more to me than which side they're on.",
    { pragmatism: 0.7, governance: -0.3 },
    "a pilot's hands on an airplane cockpit control panel at dawn, instruments glowing",
  ),
  q(
    "ai-slow-down",
    "AI is moving so fast that California should regulate it now, even if some companies leave.",
    { econ: 0.6, governance: 0.1 },
    "silicon valley office campus at night with glowing windows and abstract light trails, futuristic mood",
  ),
  q(
    "favorite-no-chance",
    "If my favorite candidate had no real chance of winning, I'd still vote for them.",
    { pragmatism: -1 },
    "a single lit candle in a dark room, flame steady, minimalist",
  ),
  q(
    "locked-toothpaste",
    "When stores have to lock up toothpaste, something has gone badly wrong with how we handle crime.",
    { safety: -0.7 },
    "a drugstore shelf of toothpaste behind a locked clear security case with a 'press for assistance' button",
  ),
  q(
    "algorithms-kids",
    "Tech companies should be legally liable when their algorithms harm kids.",
    { econ: 0.5, social: -0.1 },
    "a teenager's bedroom at night lit only by a glowing smartphone screen, face not visible",
  ),
];

export type Answer = "agree" | "disagree" | "skip";
export type Answers = Record<string, Answer>;

/** Returns each axis score in [-100, 100] plus how much evidence backs it. */
export function scoreAnswers(answers: Answers) {
  const raw = Object.fromEntries(AXES.map((a) => [a, 0])) as Record<Axis, number>;
  const max = Object.fromEntries(AXES.map((a) => [a, 0])) as Record<Axis, number>;
  for (const question of QUESTIONS) {
    const ans = answers[question.id];
    for (const [axis, weight] of Object.entries(question.w) as [Axis, number][]) {
      max[axis] += Math.abs(weight);
      if (ans === "agree") raw[axis] += weight;
      else if (ans === "disagree") raw[axis] -= weight * DISAGREE_FACTOR;
    }
  }
  return AXES.map((axis) => ({
    axis,
    ...AXIS_META[axis],
    score: max[axis] ? Math.round((raw[axis] / max[axis]) * 100) : 0,
  }));
}

export type AxisScore = ReturnType<typeof scoreAnswers>[number];
