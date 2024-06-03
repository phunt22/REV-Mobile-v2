
import { REACT_APP_SHOPIFY_URL, REACT_APP_SHOPIFY_ACCESS_TOKEN, REACT_APP_SHOPIFY_ADMIN_ACCESS_TOKEN, REACT_APP_GOOGLE_PLACES_AUTOCOMPLETE_KEY, REACT_APP_TWILIO_ACCOUNT_SID, REACT_APP_TWILIO_AUTH_TOKEN, REACT_APP_TWILIO_SERVICE_ID } from '@env'

export const config = {
  primaryColor: '#4B2D83',
  primaryColorDark: '#884EF3',
  logoWidth: 160,
  logoSizeRatio: 0.4, // height/width
  storeName: 'REV',

  instagramUsername: 'rev.delivery',

  // SHOPIFY CONFIG
  shopifyUrl: REACT_APP_SHOPIFY_URL,
  shopifyStorefrontAccessToken: REACT_APP_SHOPIFY_ACCESS_TOKEN,
  shopifyAdminAccessToken: REACT_APP_SHOPIFY_ADMIN_ACCESS_TOKEN,

  // PLACES
  googlePlacesAutocompleteKey: REACT_APP_GOOGLE_PLACES_AUTOCOMPLETE_KEY,

  // TWILIO CONFIGS
  ACCOUNT_SID: REACT_APP_TWILIO_ACCOUNT_SID,
  AUTH_TOKEN: REACT_APP_TWILIO_AUTH_TOKEN,
  SERVICE_ID: REACT_APP_TWILIO_SERVICE_ID,
}