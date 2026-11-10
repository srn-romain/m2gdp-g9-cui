// Contrats /api/v1 — miroir de specs/openapi/openapi.yaml.

export type DietaryPreference =
  | 'VEGETARIAN'
  | 'VEGAN'
  | 'NO_PORK'
  | 'NO_GLUTEN'
  | 'NO_LACTOSE'
  | 'HALAL'
  | 'KOSHER'
  | 'NO_NUTS';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED';
export type Visibility = 'PUBLIC' | 'PRIVATE';
export type TableStatus = 'OPEN' | 'FULL' | 'CANCELLED' | 'PASSED';
export type ParticipationRole = 'HOST' | 'GUEST';
export type ParticipationStatus = 'CONFIRMED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
export type ContributionCategory =
  | 'APPETIZER'
  | 'MAIN'
  | 'DESSERT'
  | 'DRINK'
  | 'INGREDIENT'
  | 'NONE';
export type ContributionStatus = 'PROPOSED' | 'CONFIRMED' | 'BROUGHT';
export type QuantityUnit = 'KG' | 'G' | 'L' | 'CL' | 'UNIT' | 'PORTION';
export type MessageType = 'TEXT' | 'AUDIO' | 'IMAGE' | 'SYSTEM';
export type TableScope = 'upcoming' | 'past' | 'all';
export type TableSort = 'distance' | 'startsAt' | 'seatsAvailable';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'TABLE_FULL'
  | 'TABLE_CLOSED'
  | 'TABLE_PASSED'
  | 'ALREADY_PARTICIPATING'
  | 'HOST_CANNOT_LEAVE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  neighborhood: string;
  city: string;
  postalCode?: string | null;
  coordinates: Coordinates;
  /** Adresse exacte : réservée à l'hôte et aux participants confirmés. */
  addressLine?: string | null;
}

export interface Rating {
  average: number;
  count: number;
}

export interface UserSummary {
  id: string;
  firstName: string;
  avatarUrl?: string | null;
  neighborhood: string;
  city: string;
  about?: string | null;
  rating?: Rating;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  neighborhood: string;
  city: string;
  coordinates?: Coordinates | null;
  dietaryPreferences: DietaryPreference[];
  avatarUrl?: string | null;
  about?: string | null;
  rating?: Rating;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserUpdate {
  firstName?: string;
  lastName?: string;
  about?: string | null;
  neighborhood?: string;
  city?: string;
  coordinates?: Coordinates;
  dietaryPreferences?: DietaryPreference[];
  avatarUrl?: string | null;
}

export interface Contribution {
  id: string;
  label: string;
  quantity?: number | null;
  unit?: QuantityUnit | null;
  category: ContributionCategory;
  status: ContributionStatus;
  participant?: UserSummary;
}

export interface ContributionInput {
  label: string;
  category: ContributionCategory;
  quantity?: number;
  unit?: QuantityUnit;
}

/** Ingrédient proposé par l'hôte : liste de courses, rattachée à aucune participation. */
export interface WantedContribution {
  label: string;
  quantity?: number | null;
  unit?: QuantityUnit | null;
}

export interface Participation {
  id: string;
  tableId: string;
  user?: UserSummary;
  role: ParticipationRole;
  status: ParticipationStatus;
  joinedAt: string;
  contribution?: Contribution | null;
}

export interface ParticipationCreate {
  contribution: ContributionInput;
}

export interface Table {
  id: string;
  /** Dérivé côté client quand l'API ne le fournit pas : « {dishName} chez {host.firstName} ». */
  title?: string;
  dishName: string;
  dishImageUrl?: string | null;
  description?: string | null;
  ambiance?: string | null;
  startsAt: string;
  durationMinutes: number;
  seatsTotal: number;
  seatsAvailable: number;
  visibility: Visibility;
  status: TableStatus;
  isVegetarian: boolean;
  dietaryTags: DietaryPreference[];
  hasAllergenNotice: boolean;
  host?: UserSummary;
  location: Location;
  contributions?: Contribution[];
  /** Ingrédients proposés par l'hôte, à apporter par les invités. */
  wantedContributions?: WantedContribution[];
  myParticipation?: Participation | null;
  distanceMeters?: number | null;
  createdAt: string;
}

export interface TableCreate {
  dishName: string;
  description?: string;
  ambiance?: string;
  dishImageUrl?: string;
  startsAt: string;
  durationMinutes?: number;
  seatsTotal: number;
  visibility?: Visibility;
  isVegetarian?: boolean;
  dietaryTags?: DietaryPreference[];
  hasAllergenNotice?: boolean;
  wantedContributions?: WantedContribution[];
  location: Location;
}

export interface Message {
  id: string;
  tableId: string;
  author?: UserSummary;
  type: MessageType;
  text?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  durationSeconds?: number | null;
  sentAt: string;
}

export interface MessageCreate {
  type: 'TEXT' | 'AUDIO' | 'IMAGE';
  text?: string;
  audioUrl?: string;
  imageUrl?: string;
  durationSeconds?: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  pagination: Pagination;
}

export interface Session {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user?: User;
}

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: Record<string, unknown> };
}
