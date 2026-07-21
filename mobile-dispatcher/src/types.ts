export type RideStatus =
  | "pending"
  | "approved"
  | "assigned"
  | "pickup"
  | "transit"
  | "delivered"
  | "cancelled"
  | "failed";

export type CargoType = "envelope" | "parcel" | "box" | "pallet" | "other";
export type MainTab = "home" | "rides" | "map" | "chat" | "more";
export type MorePage =
  | "menu"
  | "users"
  | "crm"
  | "finance"
  | "calendar"
  | "teams"
  | "employees"
  | "vending"
  | "gamification"
  | "statistics"
  | "settings";

export type DispatcherUser = {
  _id: string;
  _creationTime: number;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  status: "active" | "pending" | "inactive" | "blocked";
};

export type UserSummary = {
  _id: string;
  _creationTime: number;
  email: string;
  name?: string;
  phone?: string;
  role: "customer" | "driver" | "dispatcher" | string;
  status: "active" | "pending" | "inactive" | "blocked" | string;
  corporateStatus?: "none" | "pending" | "approved";
  companyName?: string;
  companyAddress?: string;
  companyIco?: string;
  companyDic?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  driverNotes?: string;
  receiptEnabled?: boolean;
};

export type DriverPresence = {
  driverId: string;
  isOnline: boolean;
  lastSeenAt: number;
  driverName?: string;
  vehiclePlate?: string;
};

export type Ride = {
  _id: string;
  _creationTime: number;
  customerId: string;
  driverId?: string;
  status: RideStatus;
  rideNumber: string;
  trackingToken: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupContactName: string;
  pickupContactPhone: string;
  requestedPickupAt: number;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryContactName: string;
  deliveryContactPhone: string;
  requestedDeliveryAt: number;
  estimatedDeliveryAt?: number;
  cargoType: CargoType;
  cargoDescription: string;
  weight?: number;
  quantity: number;
  price?: number;
  currency?: string;
  notes?: string;
  dispatcherNotes?: string;
  podDeliveredAt?: number;
  podRecipientName?: string;
  isPaid: boolean;
  codEnabled?: boolean;
  codAmount?: number;
  isFragile?: boolean;
  isRefrigerated?: boolean;
};

export type DriverLocation = {
  _id: string;
  driverId: string;
  driverName?: string;
  vehiclePlate?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  updatedAt: number;
  isTracking: boolean;
  activeRideId?: string;
  activeRideNumber?: string;
  activeRideStatus?: RideStatus;
};

export type DispatcherNotification = {
  _id: string;
  _creationTime: number;
  title: string;
  message: string;
  read: boolean;
  type: "ride_status" | "ride_assigned" | "invoice" | "approval" | "system";
  rideId?: string;
};

export type ChatUser = {
  _id: string;
  name: string;
  role: string;
  email: string;
};
export type ChatConversation = {
  partnerId: string;
  partnerName: string;
  partnerRole: string;
  lastMessage: string;
  lastAt: number;
  unread: number;
};
export type ChatMessage = {
  _id: string;
  _creationTime: number;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
};

export type Invoice = {
  _id: string;
  _creationTime: number;
  customerId: string;
  invoiceNumber: string;
  periodStart: number;
  periodEnd: number;
  totalAmount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: number;
  notes?: string;
};

export type CrmContact = {
  _id: string;
  _creationTime: number;
  name: string;
  type: "company" | "person";
  status: "lead" | "active" | "inactive";
  companyName?: string;
  email?: string;
  phone?: string;
  city?: string;
  ico?: string;
  dic?: string;
  address?: string;
  tags?: string[];
  notes?: string;
};

export type Team = {
  _id: string;
  _creationTime: number;
  name: string;
  description?: string;
  color?: string;
  memberCount?: number;
};

export type Availability = {
  _id: string;
  driverId: string;
  driverName?: string;
  date: string;
  available: boolean;
  startTime?: string;
  endTime?: string;
  notes?: string;
};

export type Employee = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  contractType: "hpp" | "dpp" | "dpc" | "osvc";
  status: "active" | "inactive" | "trial";
  isOnShiftToday?: boolean;
};

export type VendingOverview = {
  totalLocations: number;
  activeLocations: number;
  offlineLocations: number;
  maintenanceLocations: number;
  todayVisitsTotal: number;
  todayVisitsCompleted: number;
  todayVisitsInProgress: number;
  openIncidents: number;
  totalClients: number;
};
