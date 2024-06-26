import { AvailableShippingRatesType, Product } from "./dataTypes";

export type StackParamList = {
  TabNavigator: undefined
  ProductScreen: { data: Product }
  ShippingAddress: { cartId: string, totalPrice: number, tax: number }
  ShippingOptions: { checkoutId: string }
  Payment: { webUrl: string, checkoutId: string, selectedRateHandle: string }
  DiscountCode: { checkoutId: string }
  LoginStackNavigator: { screen: 'Login' | 'Register' }
  Cart: undefined
  SearchStackNavigator: {
    screen: keyof SearchStackParamList;
    params?: SearchStackParamList[keyof SearchStackParamList];
  };
  OrderConfirmation: undefined
  PickupConfirmation: undefined
}

export type BottomTabParamList = {
  Search: undefined
  Cart: undefined
  Profile: undefined
  Home: undefined
  Menu: undefined
}

export type HomeStackParamList = {
  Home: undefined;
  Collection: { collectionId: string }
  Cart: undefined
}

export type MenuStackParamList = {
  Menu: undefined
  Collection: { collectionId: string }
  Wishlist: undefined
}

export type SearchStackParamList = {
  Search: undefined;
  ProductScreen: { data: Product }
  Collection: { collectionId: string };
}

export type CartStackParamList = {
  Cart: undefined;
  ShippingAddress: { cartId: string, totalPrice: number, tax: number }
  ShippingOptions: { checkoutId: string, availableShippingRates: AvailableShippingRatesType }
  Payment: { webUrl: string, checkoutId: string, selectedRateHandle: string }
  DiscountCode: { checkoutId: string }
  OrderConfirmation: undefined
  PickupConfirmation: undefined
}

export type ProfileStackParamList = {
  Profile: undefined
  PersonalInformations: undefined
  ResetPassword: undefined
  Wishlist: undefined
  Orders: undefined
  SettingsPage: undefined
}

export type LoginStackParamList = {
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
  VerifyEmail: { message: string }
  ForgotPasswordEmailSent: undefined
  OnboardingPhone: { firstName: string; lastName: string };
  OnboardingName: { phoneNumber: string };
  OnboardingEmail: { firstName: string; lastName: string, phoneNumber: string };
  ForgottenPhone: undefined
  AccountActivated: undefined
}