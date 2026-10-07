// Visuels de plats : l'API n'expose pas de photo de tablée, l'illustration est
// donc dérivée du nom du plat. Photos Unsplash (licence Unsplash), mises en
// cache par le service worker (voir vite.config.ts).

const CATALOGUE: Array<{ match: RegExp; id: string }> = [
  { match: /gratin|dauphinois|parmentier|auflauf/i, id: 'photo-1548869206-93b036288d7e' },
  { match: /risotto|riz\b/i, id: 'photo-1461009683693-342af2f2d6ce' },
  { match: /soupe|potage|velout|bouillon|lentille/i, id: 'photo-1605909388460-74ec8b204127' },
  { match: /curry|pois chiche|dal\b/i, id: 'photo-1516714435131-44d6b64dc6a2' },
  { match: /quiche|tarte sal|tourte|pissaladi/i, id: 'photo-1456014673271-90b7fddf2eea' },
  { match: /lasagn|gratin de p/i, id: 'photo-1654780105295-9227206f11ec' },
  { match: /salade|crudit|taboul|gaspacho/i, id: 'photo-1546069901-ba9599a7e63c' },
  // Ingrédients proposés par l'hôte (légumes frais, herbes).
  { match: /courgette|aubergine|carotte|poivron|brocoli|légume|legume|concombre|oignon/i, id: 'photo-1546069901-ba9599a7e63c' },
  { match: /parmesan|fromage|comté|comte|gruyère|gruyere|mozzarella|feta|chèvre|chevre/i, id: 'photo-1486297678162-eb2a19b0a32d' },
  { match: /poulet|rôti|roti|volaille|magret/i, id: 'photo-1670398564097-0762e1b30b3a' },
  { match: /pizza|focaccia|calzone/i, id: 'photo-1571997478779-2adcbbe9ab2f' },
  { match: /tarte|clafouti|crumble|gâteau|gateau|dessert|crêpe|crepe/i, id: 'photo-1620980776848-84ac10194945' },
  { match: /pâte|pate|spaghetti|tagliatelle|gnocchi|carbonara/i, id: 'photo-1708184528301-b0dad28dded5' },
  { match: /poisson|saumon|cabillaud|colin|truite/i, id: 'photo-1665401015549-712c0dc5ef85' },
  { match: /brunch|petit.déjeuner|petit-dejeuner|brioche|pain/i, id: 'photo-1621523132966-19f711d565d1' },
];

const DEFAUT = 'photo-1581954548122-4dff8989c0f7';

export function dishPhotoUrl(dishName: string, width = 320): string {
  const id = CATALOGUE.find((entry) => entry.match.test(dishName))?.id ?? DEFAUT;
  return `https://images.unsplash.com/${id}?w=${width}&q=80&auto=format&fit=crop`;
}
