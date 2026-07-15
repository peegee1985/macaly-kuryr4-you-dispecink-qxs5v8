import { convexAuth } from "@convex-dev/auth/server"
import { ResendOTP } from "./ResendOTP"
import { Password } from "@convex-dev/auth/providers/Password"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    ResendOTP,
    Password({
      reset: ResendOTP,
      verify: ResendOTP,
      profile(params) {
        const role = (params.role as string) === "driver" ? "driver" : "customer"
        const name = params.name as string | undefined
        const phone = params.phone as string | undefined
        const vehicleType = params.vehicleType as string | undefined
        const vehiclePlate = params.vehiclePlate as string | undefined
        return {
          email: params.email as string,
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          ...(vehicleType ? { vehicleType } : {}),
          ...(vehiclePlate ? { vehiclePlate } : {}),
          role,
          status: role === "driver" ? ("pending" as const) : ("active" as const),
          corporateStatus: "none" as const,
        }
      },
    }),
  ],
})
