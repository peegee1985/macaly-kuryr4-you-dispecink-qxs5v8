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
export type MainTab = "home" | "rides" | "new" | "more";
export type MorePage = "menu" | "profile" | "templates" | "documents" | "receipts";

export type CustomerUser = {
  _id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  status: "active" | "pending" | "inactive";
  corporateStatus: "none" | "pending" | "approved";
  companyName?: string;
  companyAddress?: string;
  companyIco?: string;
  companyDic?: string;
};

export type Ride = {
  _id: string;
  _creationTime: number;
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
  stripePaymentUrl?: string;
};

export type TrackingRide = {
  _id: string;
  rideNumber: string;
  status: RideStatus;
  driverName?: string;
  driverLat?: number;
  driverLng?: number;
  estimatedDeliveryAt?: number;
};

export type RideTemplate = {
  pickupAddress: string;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryAddress: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  cargoType: CargoType;
  cargoDescription: string;
  weight?: number;
  quantity: number;
  notes?: string;
};

export type CustomerTemplate = {
  _id: string;
  title: string;
  active: boolean;
  rideTemplate: RideTemplate;
};

export type Invoice = {
  _id: string;
  invoiceNumber: string;
  periodStart: number;
  periodEnd: number;
  totalAmount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: number;
  notes?: string;
};

export type CustomerDocument = {
  _id: string;
  filename: string;
  description?: string;
  uploadedAt: number;
  url: string | null;
};

export type Receipt = {
  _id: string;
  receiptNumber: string;
  issuedAt: number;
  amount: number;
  currency: string;
  paymentMethod: "hotovost" | "prevod" | "faktura" | "karta";
  isPaid: boolean;
  driverName?: string;
  pickupAddress: string;
  deliveryAddress: string;
  cargoDescription: string;
  rideNumber: string;
};

export type CustomerNotification = {
  _id: string;
  _creationTime: number;
  title: string;
  message: string;
  read: boolean;
  type: "ride_status" | "ride_assigned" | "invoice" | "approval" | "system";
  rideId?: string;
};
