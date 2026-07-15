export type RideStatus =
  | "pending"
  | "approved"
  | "assigned"
  | "pickup"
  | "transit"
  | "delivered"
  | "cancelled"
  | "failed";

export type Ride = {
  _id: string;
  rideNumber: string;
  status: RideStatus;
  pickupAddress: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  deliveryAddress: string;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  requestedPickupAt: number;
  requestedDeliveryAt: number;
  cargoType?: string;
  cargoDescription?: string;
  quantity?: number;
  weight?: number;
  notes?: string;
  dispatcherNotes?: string;
  price?: number;
  currency?: string;
  codEnabled?: boolean;
  codAmount?: number;
  codCollected?: boolean;
};

export type DriverUser = {
  _id: string;
  email?: string;
  name?: string;
  phone?: string;
  role: string;
  status: "pending" | "active" | "inactive" | "blocked";
  vehicleType?: string;
  vehiclePlate?: string;
  driverPushAssigned?: boolean;
  driverPushAvailable?: boolean;
  driverEmailAssigned?: boolean;
};

export type ChatConversation = {
  partnerId: string;
  partnerName: string;
  partnerRole: string;
  lastMessage: string;
  lastAt: number;
  unread: number;
};

export type ChatUser = {
  _id: string;
  name: string;
  role: string;
  email?: string;
};

export type ChatMessage = {
  _id: string;
  _creationTime: number;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
};

export type AppNotification = {
  _id: string;
  _creationTime: number;
  title: string;
  message: string;
  read: boolean;
  type: string;
  rideId?: string;
};

export type ServiceLocation = {
  _id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  accessInstructions?: string;
  pinCode?: string;
};

export type ServiceVisit = {
  _id: string;
  visitNumber: string;
  status: string;
  scheduledAt: number;
  estimatedDuration?: number;
  location?: ServiceLocation | null;
  driverNotes?: string;
  checklist?: {
    _id: string;
    completedAt?: number;
    items: Array<{
      itemId: string;
      text: string;
      completed: boolean;
      textValue?: string;
    }>;
  } | null;
  photos?: Array<{ _id: string; url?: string; category: string }>;
  incidents?: Array<{ _id: string; type: string; severity: string; status: string }>;
};

export type Availability = {
  _id: string;
  date: string;
  available: boolean;
  startTime?: string;
  endTime?: string;
  notes?: string;
};

export type MainTab = "home" | "rides" | "chat" | "vending" | "availability" | "profile";
