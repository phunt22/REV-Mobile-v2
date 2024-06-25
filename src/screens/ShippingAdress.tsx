import { View, Text, Image, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions, NativeModules, StatusBar, Alert, Linking } from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CartStackParamList } from '../types/navigation'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { theme } from '../constants/theme'
import { storefrontApiClient } from '../utils/storefrontApiClient'
import { ScrollView, TextInput } from 'react-native-gesture-handler'
import FillButton from '../components/shared/FillButton'
import { Entypo } from '@expo/vector-icons'
import BottomSheet, { TouchableHighlight, TouchableOpacity } from '@gorhom/bottom-sheet'
import { provinces } from '../constants/provinces'
import { AvailableShippingRatesType } from '../types/dataTypes'
import { useAuthContext } from '../context/AuthContext'
import Icon from 'react-native-vector-icons/FontAwesome'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import logoDark from '../assets/logo-dark.png'
import logo from '../assets/logo.png'
import { ChevronDownIcon, PinIcon, RightArrowIcon } from '../components/shared/Icons'
import * as WebBrowser from 'expo-web-browser'
import { LinearGradient } from 'expo-linear-gradient';
import { adminApiClient, checkIfPasswordProtected, createOrder } from '../utils/checkIfPasswordProtected'
import { config } from '../../config'
import { useCartContext } from '../context/CartContext'
import { useLocations } from '../context/LocationsContext'
import PriceInput from '../components/cart/PriceInput'
import CartStackNavigator from './StackNavigators/CartStackNavigator'
import { handleURLCallback, usePaymentSheet } from '@stripe/stripe-react-native'
import axios from 'axios'

import { REACT_APP_SHIPDAY_API_KEY, REACT_APP_FIREBASE_URL } from '@env'
import { initialCalculations } from 'react-native-reanimated/lib/typescript/reanimated2/animation/springUtils'
// const shipday = require('shipday/integration');
// const OrderQueryRequest = require('shipday/integration/order/order.query.request');
// const OrderState = require('shipday/integration/order/types/order.state');




type Props = NativeStackScreenProps<CartStackParamList, 'ShippingAddress'>

const ShippingAddress = ({ route, navigation }: Props) => {
  const { selectedLocation, isLocationOpen, updateLocationStatus } = useLocations(); // Get selected location
  const scrollViewRef = useRef<ScrollView>(null)
  const { userToken } = useAuthContext()
  const bottomSheetRef = useRef<BottomSheet>(null);


  const { StatusBarManager } = NativeModules
  const { resetCart } = useCartContext();
  const [sbHeight, setsbHeight] = useState<any>(StatusBar.currentHeight)
  const [isClosed, setIsClosed] = useState<boolean>(false)
  const [initializing, setInitializing] = useState<boolean>(true)
  const { cartItems, getTotalPrice } = useCartContext();

  const [discountCode, setDiscountCode] = useState<string>('')

  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string>('Delivery')

  // const API_URL = process.env.REACT_APP_FIREBASE_URL;

  useEffect(() => {
    if (!selectedLocation.isOpen) {
      navigation.goBack()
    }
  }, [selectedLocation])


  // this is outdated, as we no longer need to calculate tax since we get it from the previous.
  // in the future, tax data could be stored in location objects
  // will return them individually which is pretty chill. 
  // const calculateTax = (total) => {
  //   const washTax = parseFloat(total) * 0.065;
  //   const seaTax = parseFloat(total) * 0.0385;
  //   return (washTax + seaTax).toFixed(2);
  // }

  useEffect(() => {
    if (Platform.OS === "ios") {
      StatusBarManager.getHeight((statusBarHeight: any) => {
        setsbHeight(Number(statusBarHeight.height))
      })
    }
    navigation.setOptions({
      headerTitle: () => (
        // <Text style={styles.screenTitle}>Cart ({getItemsCount()})</Text>
        <Text style={{ fontSize: 30, fontStyle: 'italic', fontWeight: '900', color: '#4B2D83' }}>REVIEW</Text>
        // <Image source={require('../../assets/CHECKOUT.png')} style={{ height: 25, width: 175, marginTop: 0 }} resizeMode='contain' />
      )
    })
  }, [])

  const { cartId, totalPrice: subtotal, tax } = route.params
  // console.log(totalPrice)


  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState(userToken ? userToken.customer.email : '')
  const [firstName, setFirstName] = useState(userToken ? userToken.customer.firstName : '')
  const [lastName, setLastName] = useState(userToken ? userToken.customer.lastName : '')
  const [phone, setPhone] = useState(userToken.customer?.phone || '')
  const [province, setProvince] = useState<{ code: string, province: string } | null>(null)
  const [zip, setZip] = useState('')
  const [selectedRateHandle, setSelectedRateHandle] = useState<string | null>(null);
  const [shippingOptionError, setShippingOptionError] = useState('');
  const [availableShippingRates, setAvailableShippingRates] = useState<AvailableShippingRatesType | null>(null);
  // const [orderNotes, setOrderNotes] = useState("Hey guys this is Will. Please don't fulfill this order, I'm just trying to test some stuff out. If anyhting gets messed up lmk, my number is (206)471-1231")
  const [orderNotes, setOrderNotes] = useState<string>("")
  const [defaultAddress, setDefaultAddress] = useState(null);

  const [selectedTipIndex, setSelectedTipIndex] = useState<number>(1);
  const [customTipAmount, setCustomTipAmount] = useState('0');
  const textInputRef = useRef<TextInput>(null);
  const [total, setTotal] = useState<number>(null)

  // Calculate the subtotal
  // const subtotal = getTotalPrice();

  // Calculate the total taxes
  // const taxes = calculateTax(subtotal);

  // Define the delivery fee and tip
  const deliveryFee = selectedDeliveryMethod === 'Delivery' ? 0.99 : 0.00;
  const tip = selectedTipIndex !== 4 ? selectedTipIndex : parseFloat(customTipAmount.length > 0 ? customTipAmount : '0');

  // Calculate the total amount

  const calculateTotal = (subtotal: number, tax: number, tip: number, deliveryFee: number): number => {
    const total: number = subtotal + tax + tip + deliveryFee;
    // console.log('total', total)
    return parseFloat(total.toFixed(2));
    // return parseFloat(total.toFixed(2)) // will effectively just round to 2 decimal places
  };

  // this way, our total is always up to date
  useEffect(() => {
    const new_total: number = calculateTotal(subtotal, tax, tip, deliveryFee)
    setTotal(new_total)
  }, [subtotal, tax, tip, deliveryFee])

  // const { initPaymentSheet, presentPaymentSheet, loading } = usePaymentSheet();
  const {
    initPaymentSheet,
    presentPaymentSheet,
    loading,
    resetPaymentSheetCustomer,
  } = usePaymentSheet();
  const [ready, setReady] = useState<boolean>(false)

  useEffect(() => {
    try {
      setReady(false)
      initializePaymentSheet();
      // ready will be set back to true when we finish fetching everything 
    } catch (e) {
      setErrorMessage('Error initializing payment')
    }

    // const testing = async () => {
    //   const response = await fetch('https://us-central1-revdelivery.cloudfunctions.net/helloWorld', {
    //     method: 'GET',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //   });
    //   if (response) {
    //     console.log('got something')
    //     console.log(response)
    //   }
    // }
    // testing();
  }, [total]) // if our total changes, we want to get the new total

  useEffect(() => {
    // console.log('received params:')
    // console.log('subtotal_ship:', subtotal)
    // console.log('tax_ship:', tax)
    // console.log('cartId_ship:', cartId)
    calculateTotal(subtotal, tax, tip, deliveryFee)
  }, [])


  useEffect(() => {
    const init = async () => {
      setInitializing(true)
      try {
        await initializePaymentSheet();
      } catch (e) {
        setErrorMessage('Error initializing payment')
      } finally {
        setInitializing(false)
      }
    }
  }, [total]) // want to change if we need to change the totla


  // added support for handling deep links as per Stripe docs. This was we can have a returnURL
  // honestly, dont have a lot of code here because Im not doing too much
  const handleDeepLink = useCallback(
    async (url) => {
      if (url) {
        const stripeHandled = await handleURLCallback(url);
        if (stripeHandled) {
          // This was a Stripe URL - handle redirection
          // redirect();
          // console.log('STRIPE PAYMENT')
        } else {
          // This was NOT a Stripe URL – handle as you normally would
          // console.log('NOT STRIPE PAYMENT')
        }
      }
    },
    [handleURLCallback]
  );

  useEffect(() => {
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLink(initialUrl);
    };

    getUrlAsync();

    const deepLinkListener = Linking.addEventListener(
      'url',
      (event) => {
        handleDeepLink(event.url);
      }
    );

    return () => deepLinkListener.remove();
  }, [handleDeepLink]);

  // this is what gets the parameters for the payment sheet
  const fetchPaymentSheetParams = async () => {
    // this is just to ensure that we are able to connect to the api properly
    if (!total || !email) {
      setErrorMessage("Something went wrong, we couldn\'t find your email or total")
      return
    }
    try {
      const response = await axios.post(`${REACT_APP_FIREBASE_URL}/payment-sheet`, {
        email: userToken.customer.email,
        totalPrice: total, // straight from the previous page, which was given to us by shopify
      });

      if (!response || !response.data) {
        setErrorMessage('Invalid API Response')
        return;
        // throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { paymentIntent, ephemeralKey, customer } = response.data;
      // setErrorMessage('We got a response:' + 'payment:' + paymentIntent + 'eph' + ephemeralKey + 'cust' + customer)


      // const response = await fetch(`${API_URL}/payment-sheet`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     email: userToken.customer.email,
      //     totalPrice: parseFloat(total),
      //   })
      // });



      // const responseText = response.text();
      // console.log(responseText)
      // const responseText = await response.text();
      // console.log('Response Text:', responseText);


      // const jsonResponse = JSON.parse(responseText);
      // const { paymentIntent, ephemeralKey, customer } = jsonResponse

      // const { paymentIntent, ephemeralKey, customer } = await response.json();
      if (!paymentIntent) {
        // console.log('Houston we have a prolem')
        setErrorMessage("Seems like something is wrong with our servers, paymentIntent wasn't generated. \nPlease check back later!")
      }      // console.log(response.json())
      return { paymentIntent, ephemeralKey, customer };
    } catch (e) {
      // console.log('fetch PS', e)
      setErrorMessage('Seems like something is wrong with our servers. \nPlease check back later!' + '\n' + e.message
      )
      return null //idk wtf I wold return here lmao
    }
  };


  const initializePaymentSheet = async () => {
    const params = await fetchPaymentSheetParams();
    if (!params) { return }
    const { paymentIntent } = params
    if (!paymentIntent) { setErrorMessage('Issue with our servers! No payment intent was formed'); return; }

    // const { paymentIntent, ephemeralKey, customer } = await fetchPaymentSheetParams();
    // if (!paymentIntent) {
    //   return
    // }
    const { error } = await initPaymentSheet({
      appearance: {
        primaryButton: {
          shapes: {
            borderRadius: 20
          }
        },
        colors: {
          primary: config.primaryColor
        }
      },
      paymentIntentClientSecret: paymentIntent,
      merchantDisplayName: 'REV Delivery',
      applePay: {
        merchantCountryCode: 'US',
      },
      // googlePay: {
      //   merchantCountryCode: 'US',
      //   testEnv: true,
      //   currencyCode: 'usd',
      // },
      allowsDelayedPaymentMethods: false,
      // returnURL: 'your-app://stripe-redirect',
      returnURL: 'revdelivery://stripe-redirect',
    });

    if (error) {
      // console.log(error)
      // Alert.alert(`Error code: ${error.code}`, error.message);
      // console.log('init PS', error)
      return false
    } else {
      setReady(true);
      return true
    }
  };

  const handleCustomTipChange = (newCustomTipAmount: string) => {
    setCustomTipAmount(newCustomTipAmount);
  };

  const focusTextInput = () => {
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };



  // // returns a boolean if the action was successful
  // async function buy() {
  //   const { error } = await presentPaymentSheet(); // presents the payment sheet to the user

  //   if (error) {
  //     Alert.alert(error.message)
  //     return false
  //   } else {
  //     Alert.alert('successful payment wtf')
  //     return true;
  //   }
  // }

  const buy = async () => {
    // // put all of my fail safes here
    // if (!selectedLocation.isOpen || !email || !selectedDeliveryMethod || !total || ) {
    //   return;
    // }
    const { error } = await presentPaymentSheet();
    if (error) {
      // Alert.alert(`Error code: ${error.code}`, error.message);
      if (error.message !== 'The payment has been canceled') { // 
        setErrorMessage(`Payment failed: ${error.message}`)
      }
      return false
    } else {
      setReady(false);
      // Alert.alert('successful payment wtf')
      return true;
    }
  };

  const redirect = () => {
    resetCart();
    if (selectedDeliveryMethod === 'Delivery') {
      navigation.navigate('OrderConfirmation')
    } else {
      navigation.navigate('PickupConfirmation')
    }

  }



  // THIS IS THE MEAT AND POTATOES METHOD
  // what happens if something fails????

  // there would be an issue if one of them failed but not all of them so that is something to look into
  const handleNewCheckout = async () => {
    // LOT OF SANITY CHECKS HERE
    // make sure that the store is open
    // make sure that the needed fields are present
    if (!email) {
      setErrorMessage('You need an email to checkout! \n Enter it under Personal Information')
    }

    if (!isLocationOpen(selectedLocation.id)) {
      updateLocationStatus(selectedLocation.id, false)
    }


    // ensure that we have things like address, phone, etc. etc. 


    let stripeSuccess: boolean = false;
    try {
      stripeSuccess = await buy();
      if (!stripeSuccess) {
        return
      }
      const orderNum = await sendToShopify();
      // send to shipday (if needed)
      // redirect to confirmation screen
      if (!orderNum) {
        setErrorMessage('Look like something went wrong. Please try again')
        return
      }

      // uncomment this to manually send to shipday. Currently will automatically send to shipday. 
      // if (selectedDeliveryMethod === 'Delivery') { // because we dont put in-store pickup orders on shipday
      //   const order = {
      //     orderNumber: orderNum, // this is gotten from the shopify order
      //     orderItems: cartItems.map(item => ({
      //       name: item.title,
      //       unitPrice: item.price.amount,
      //       quantity: item.quantity,
      //     })),
      //     delivery: {
      //       name: userToken.firstName + userToken.lastName,
      //       address: `${address1}, ${city}, Washington, United States, ${zip}`,
      //       phone: userToken.phone,
      //       email: userToken.email,
      //       lat: '', // leaving these blank because they are annoying to get :/
      //       lng: '', // leaving these blank because they are annoying to get :/
      //     },
      //     orderTotal: parseFloat(total),
      //     deliveryFee: selectedDeliveryMethod === 'Delivery' ? 0.99 : 0,
      //     tip: tip,
      //     tax: taxes,
      //   };

      //   // do not send to shipday, it will automatically do that I think lol
      //   // const shipdaySuccess = await sendToShipday(order);
      //   // if (!shipdaySuccess) {
      //   //   setErrorMessage('Look like something went wrong. Please try again')
      //   //   console.log("FAILED TO SEND TO SHIPDAY")
      //   //   return
      //   // }
      // }
      redirect()
    } catch (error) {
      // console.error('Error during checkout:', error);
      if (stripeSuccess === true) {
        setErrorMessage('Oops! Something went wrong with your order.\nPlease contact us if your payment went through')
      } else {
        setErrorMessage('Looks like something went wrong. Please try again later.');
      }

    }
  }

  const sendToShopify = async () => {
    const { customer } = userToken;

    // const lineItems: any = cartItems.map(item => ({
    //   variantId: item.id, // Ensure variantId is in the correct format
    //   quantity: item.quantity,
    //   title: item.title,
    //   originalUnitPrice: item.price.amount,
    //   customAttributes: item.selectedOptions?.filter(attr => attr.key && attr.value) || [] // Filter out null attributes
    // }));




    try {
      // console.log(selectedDeliveryMethod)

      let shippingLine = {};
      // if (selectedDeliveryMethod === "Pickup") {
      // shippingLine = {
      //   title: "Local pickup",
      //   code: "Pickup",
      //   price: 0.00,
      //   price_set: {
      //     shop_money: {
      //       amount: "0.00",
      //       currency_code: "USD"
      //     },
      //     presentment_money: {
      //       amount: "0.00",
      //       currency_code: "USD"
      //     }
      //   }
      // };

      // // shippingLine = {
      // //   title: "Local pickup",
      // //   code: "Pickup",
      // //   source: "shopify",
      // //   originalPriceSet: {
      // //     shopMoney: {
      // //       amount: "0.00",
      // //       currencyCode: "USD"
      // //     },
      // //     presentmentMoney: {
      // //       amount: "0.00",
      // //       currencyCode: "USD"
      // //     }
      // //   }
      // // };
      //   shippingLine = {
      //     id: 4681342091552,
      //     carrier_identifier: "650f1a14fa979ec5c74d063e968411d4",
      //     code: "UW Store",
      //     discounted_price: "0.00",
      //     discounted_price_set: {
      //       shop_money: {
      //         amount: "0.00",
      //         currency_code: "USD"
      //       },
      //       presentment_money: {
      //         amount: "0.00",
      //         currency_code: "USD"
      //       }
      //     },
      //     phone: phone,
      //     email: email,
      //     price: "0.00",
      //     price_set: {
      //       shop_money: {
      //         amount: "0.00",
      //         currency_code: "USD"
      //       },
      //       presentment_money: {
      //         amount: "0.00",
      //         currency_code: "USD"
      //       }
      //     },
      //     source: "shopify",
      //     title: "UW Store",
      //     tax_lines: [],
      //     discount_allocations: []
      //   }
      // } else if (selectedDeliveryMethod === "Delivery") {
      //   // shippingLine = {
      //   //   title: "Delivery Fee - UW",
      //   //   code: "Delivery",
      //   //   source: "shopify",
      //   //   originalPriceSet: {
      //   //     shopMoney: {
      //   //       amount: "0.99",
      //   //       currencyCode: "USD"
      //   //     },
      //   //     presentmentMoney: {
      //   //       amount: "0.99",
      //   //       currencyCode: "USD"
      //   //     }
      //   //   }
      //   // };
      //   // shippingLine = {
      //   //   carrier_identifier: "736c7301c5a02f233a576b183445b66f",
      //   //   title: "Delivery Fee - UW",
      //   //   code: "Delivery",
      //   //   price: "0.99",
      //   // };
      //   shippingLine = {
      //     title: "Delivery Fee - UW",
      //     code: "Delivery",
      //     price: "0.99",
      //     price_set: {
      //       shop_money: {
      //         amount: "0.99",
      //         currency_code: "USD"
      //       },
      //       presentment_money: {
      //         amount: "0.99",
      //         currency_code: "USD"
      //       }
      //     },
      //     phone: phone,
      //     email: email,
      //     carrier_identifier: "736c7301c5a02f233a576b183445b66f", // carrier ID for delivery. 
      //     source: "shopify",
      //     tax_lines: [],
      //     discount_allocations: []
      //   };
      if (selectedDeliveryMethod === "Pickup") {
        shippingLine = {
          carrier_identifier: "650f1a14fa979ec5c74d063e968411d4",
          delivery_category: null,
          title: "UW Store",
          code: "UW Store",
          price: "0.00",
          price_set: {
            shop_money: {
              amount: "0.00",
              currency_code: "USD"
            },
            presentment_money: {
              amount: "0.00",
              currency_code: "USD"
            }
          },
          source: "shopify",
          tax_lines: [],
          // "carrier_identifier": null,
          discount_allocations: []
        };
      } else if (selectedDeliveryMethod === "Delivery") {
        shippingLine = {
          title: "Delivery Fee - UW",
          code: "Delivery",
          price: "0.99",
          price_set: {
            shop_money: {
              amount: "0.99",
              currency_code: "USD"
            },
            presentment_money: {
              amount: "0.99",
              currency_code: "USD"
            }
          },
          carrier_identifier: "736c7301c5a02f233a576b183445b66f",
          source: "shopify",
          tax_lines: [],
          discount_allocations: []
        };
      }

      // }

      // console.log('shipLine', shippingLine)

      const lineItems: any = cartItems.map(item => ({
        variant_id: parseInt(item.id.split('/').pop()),  // Ensure variant_id is a plain numeric string
        quantity: item.quantity,
        title: item.product.title,
        price: item.price.amount.toString(), // make sure this is a string
        "tax_lines": [
          {
            "price": parseFloat((item.price.amount * item.quantity * 0.065).toFixed(2)).toFixed(2), // 6.5% state tax
            "rate": 0.065,
            "title": "Washington State Tax"
          },
          {
            "price": parseFloat((item.price.amount * item.quantity * 0.0385).toFixed(2)).toFixed(2), // 3.85% city tax
            "rate": 0.0385,
            "title": "Seattle City Tax"
          }
        ],
        requires_shipping: selectedDeliveryMethod === "Delivery", // true if delivery, false if pickup
        // requires_shipping: true, // always true, since instore pickup is technically shipping
        // double check that this works later. I dont think that we need this lol.
        // properties: item.selectedOptions?.map(attr => ({ name: attr, value: attr.value })) || []
      }))


      const nonStrings = lineItems.filter(item => typeof item.price !== 'string')
      // add the user tip
      // const tipAmount = 2.83;

      const tipAmount = selectedTipIndex !== 4 ? selectedTipIndex : parseFloat(customTipAmount)
      if (tipAmount > 0) {
        lineItems.push({
          title: 'Tip',
          price: tipAmount.toFixed(2), // format tip amount to 2 decimal places
          quantity: 1,
          requires_shipping: false,
        })
      }


      // HERE IS WHERE WE CREATE THE ORDER WITHIN SHOPIFY
      // TODO: handle discounts, fix locations, fix delivery
      const order = await createOrder({
        line_items: lineItems,
        customer: {
          id: parseInt(userToken.customer.id.split('/').pop()),
          email: userToken.customer.email,
          first_name: userToken.customer.firstName,
          last_name: userToken.customer.lastName,
          phone: userToken.customer.phone,
        },


        // only input shipping address if its a delivery order, as following website
        shipping_address: selectedDeliveryMethod === 'Delivery' ? {
          first_name: firstName,
          last_name: lastName,
          address1: address1,
          address2: address2,
          city: city,
          province: province.code,
          country: "US",
          zip: zip,
          phone: phone,
        } : undefined,
        // billing address not needed because of the shipping address being the same
        // also the user is filling in shipping address, not billing address
        // billing_address: {
        //   first_name: firstName,
        //   last_name: lastName,
        //   address1: address1,
        //   address2: address2,
        //   city: city,
        //   province: province.code,
        //   country: "US",
        //   zip: zip,
        //   phone: phone,
        // },
        shipping_lines: selectedDeliveryMethod === 'Delivery' ? [shippingLine] : undefined, // this is fucked I think???
        location_id: selectedLocation.id.split('/').pop(),
        financial_status: "paid",
        // these are the 3 that come from the shopify, they are essentially just going back into it lol
        // they are stored as numbers, but need to be strings to hit em w toFixed2
        total_price: total.toFixed(2),
        subtotal_price: subtotal.toFixed(2),
        total_tax: tax.toFixed(2),
        note: orderNotes,
        tags: ["REV Mobile v2"]
      });
      // console.log('Order created:', order);
      // console.log(order.name)
      return order.name;
    } catch (error) {
      console.error('Error during checkout:', error);
      setErrorMessage('An error occurred during checkout.');
      return false;
    }
  }


  // none of shipday has been implemented yet. This is actually not needed!!!!

  const sendToShipday = async (order) => {
    const SHIPDAY_API_URL = 'https://api.shipday.com/orders';
    // const shipdayAPIKey = REACT_APP_SHIPDAY_API_KEY;
    const shipdayAPIKey = '8kQPgBCOzF.yPDcFdKMtgP5KXSRCg2P'


    const orderPayload = {
      orderNumber: order.orderNumber,
      orderItems: order.orderItems.map(item => ({
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity
      })),
      deliveryNote: orderNotes,
      pickup: {
        id: null,
        name: "REV Delivery",
        address: "4750 University Way NE, Seattle, WA, USA",
        formattedAddress: "4750 University Way Northeast, University District, Seattle, Washington 98105, United States",
        phone: "+1(206) 833-6358",
        lat: 47.6645226,
        lng: -122.3128206
      },
      delivery: {
        name: order.delivery.name,
        address: order.delivery.address,
        formattedAddress: order.delivery.address,
        phone: order.delivery.phone,
        email: order.delivery.email,
        paymentMethod: "ONLINE",
        orderSource: "REV Mobile", // idk if this should be corrected to REV Mobile??? before was shopify""
        orderTotal: order.orderTotal,
        deliveryFee: order.deliveryFee,
        tip: order.tip,
        tax: order.tax
      }
    };
    // console.log(typeof orderPayload.orderItems[0].unitPrice)
    try {
      const response = await axios.post(SHIPDAY_API_URL, orderPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shipdayAPIKey}`
        }
      });
      // console.log('order inserted successfully')
      return true;
    } catch (e) {
      // console.log(e)
      return false;
    }
    return false;
  }


  const updateShippingOption = async () => {
    if (!selectedRateHandle) {
      setShippingOptionError('Please select a shipping option.');
      return;
    }
    setShippingOptionError('');
    setIsLoading(true);

    try {
      const query = `mutation checkoutShippingLineUpdate($checkoutId: ID!, $shippingRateHandle: String!) {
        checkoutShippingLineUpdate(checkoutId: $checkoutId, shippingRateHandle: $shippingRateHandle) {
          checkout {
            id
            webUrl
          }
          checkoutUserErrors {
            code
            field
            message
          }
        }
      }`;

      const variables = {
        cartId,
        shippingRateHandle: "shopify-Delivery%20Fee%20-%20UW-0.99",
        // shippingRateHandle: selectedRateHandle
      };

      const response: any = await storefrontApiClient(query, variables);

      if (response.errors && response.errors.length != 0) {
        throw response.errors[0].message;
      }

      if (response.data.checkoutShippingLineUpdate.checkoutUserErrors && response.data.checkoutShippingLineUpdate.checkoutUserErrors.length != 0) {
        throw response.data.checkoutShippingLineUpdate.checkoutUserErrors[0].message;
      }

      const webUrl = response.data.checkoutShippingLineUpdate.checkout.webUrl;

      // Here you can navigate to the payment screen or handle the webUrl as needed
      // For example: navigation.push('Payment', { webUrl, checkoutId, selectedRateHandle });
      // navigation.push('Payment', { webUrl, checkoutId, selectedRateHandle })


    } catch (e) {
      // console.log(e);
      if (typeof e === 'string') {
        setShippingOptionError(e);
      } else {
        setShippingOptionError('An error occurred while updating the shipping option.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateShippingAdress = async () => {
    setIsLoading(true)
    setErrorMessage('')

    // if (!phone) {
    //   setErrorMessage('Please add your phone number.')
    //   setIsLoading(false)
    //   return
    // }

    try {
      const query = `mutation checkoutEmailUpdateV2($checkoutId: ID!, $email: String!) {
        checkoutEmailUpdateV2(checkoutId: $checkoutId, email: $email) {
          checkout {
            id
          }
          checkoutUserErrors {
            code
            field
            message
          }
        }
      }`

      const variables = {
        cartId,
        email
      }

      const updateEmailResponse: any = await storefrontApiClient(query, variables)

      if (updateEmailResponse.errors && updateEmailResponse.errors.length != 0) {
        throw updateEmailResponse.errors[0].message
      }

      if (updateEmailResponse.data.checkoutEmailUpdateV2.checkoutUserErrors && updateEmailResponse.data.checkoutEmailUpdateV2.checkoutUserErrors.length != 0) {
        throw updateEmailResponse.data.checkoutEmailUpdateV2.checkoutUserErrors[0].message
      }

      const query2 = `mutation checkoutShippingAddressUpdateV2($checkoutId: ID!, $shippingAddress: MailingAddressInput!) {
        checkoutShippingAddressUpdateV2(checkoutId: $checkoutId, shippingAddress: $shippingAddress) {
          checkout {
            id
            availableShippingRates {
              ready
              shippingRates {
                handle
                title
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
          checkoutUserErrors {
            code
            field
            message
          }
        }
      }`

      if (province == null) {
        throw 'Please select a State.'
      }

      const variables2 = {
        cartId,
        allowPartialAddresses: true,
        shippingAddress: {
          address1: address1,
          address2: address2,
          city: city,
          company: "",
          country: "US",
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          province: province.code,
          zip: zip
        }
      }

      const response: any = await storefrontApiClient(query2, variables2)
      if (response.errors && response.errors.length != 0) {
        throw response.errors[0].message
      }

      if (response.data.checkoutShippingAddressUpdateV2.checkoutUserErrors && response.data.checkoutShippingAddressUpdateV2.checkoutUserErrors.length != 0) {
        throw response.data.checkoutShippingAddressUpdateV2.checkoutUserErrors[0].message
      }

      const availableShippingRates: AvailableShippingRatesType = response.data.checkoutShippingAddressUpdateV2.checkout.availableShippingRates as AvailableShippingRatesType
      setAvailableShippingRates(availableShippingRates)
      // console.log(availableShippingRates);
      // navigation.push('ShippingOptions', { checkoutId, availableShippingRates })

    } catch (e) {
      // console.log(e)
      if (typeof e == 'string') {
        setErrorMessage(e)
      } else {
        setErrorMessage('Something went wrong. Try again.')
      }
    }

    setIsLoading(false)
  }

  const getCustomerAddress = async () => {
    setIsLoading(true)
    setErrorMessage('')

    if (userToken) {
      try {
        const query = `query {
          customer(customerAccessToken: "${userToken.accessToken}") {
            defaultAddress {
              address1
              address2
              city
              province
              country
              zip
            }
          }
        }`

        const response: any = await storefrontApiClient(query)

        if (response.errors && response.errors.length != 0) {
          setIsLoading(false)
          throw response.errors[0].message
        }

        const fetchedDefaultAddress = response.data.customer.defaultAddress;
        setDefaultAddress(fetchedDefaultAddress);
        setIsLoading(false)
      } catch (e) {
        // console.log(e)
      }
    }
  }

  const updateCustomerAddress = async () => {
    setIsLoading(true)
    setErrorMessage('')

    if (userToken && defaultAddress) {
      try {
        const query = `query {
          customer(customerAccessToken: "${userToken.accessToken}") {
            defaultAddress {
              id
            }
          }
        }`

        const response: any = await storefrontApiClient(query)

        if (response.errors && response.errors.length != 0) {
          setIsLoading(false)
          throw response.errors[0].message
        }

        if (response.data.customer.defaultAddress === null) {
          createCustomerAddress()
        } else {

          const defaultAddressId = response.data.customer.defaultAddress.id

          const mutation = `mutation {
          customerAddressUpdate(
            customerAccessToken: "${userToken.accessToken}"
            id: "${defaultAddressId}"
            address: {
              address1: "${defaultAddress.address1}"
              address2: "${defaultAddress.address2}"
              city: "${defaultAddress.city}"
              province: "${defaultAddress.province}"
              country: "${defaultAddress.country}"
              zip: "${defaultAddress.zip}"
            }
          ) {
            customerAddress {
              id
            }
          }
        }`

          const mutationResponse: any = await storefrontApiClient(mutation)

          if (response.errors && response.errors.length != 0) {
            setIsLoading(false)
            throw response.errors[0].message
          }
          setIsLoading(false)
        }

        setIsLoading(false)
      } catch (e) {
        // console.log(e)
      }
    }
    setIsLoading(false)
  }

  const createCustomerAddress = async () => {
    setIsLoading(true)
    setErrorMessage('')

    if (userToken) {
      try {
        const mutation = `mutation {
          customerAddressCreate(
            customerAccessToken: "${userToken.accessToken}"
            address: {
              address1: "${defaultAddress.address1}"
              address2: "${defaultAddress.address2}"
              city: "${defaultAddress.city}"
              province: "${defaultAddress.province}"
              country: "${defaultAddress.country}"
              zip: "${defaultAddress.zip}"
            }
          ) {
            customerAddress {
              address1
              city
              province
              country
              zip
            }
          }
        }`

        const response: any = await storefrontApiClient(mutation)

        if (response.errors && response.errors.length != 0) {
          setIsLoading(false)
          throw response.errors[0].message
        }
        setIsLoading(false)
      } catch (e) {
        // console.log(e)
      }
    }
    setIsLoading(false)
  }

  const GooglePlacesInput = () => {
    const [showAutocomplete, setShowAutocomplete] = useState<boolean>(false);

    return (
      // can use radius, srictbounds parameters so that we limit any autocompletes, so effectively people can't put an address outside of a certain radius. If that is something that we want to do. 
      <View style={{ width: '100%', height: 475, alignItems: 'center' }}>

        <GooglePlacesAutocomplete
          placeholder='4748 University Wy NE A, Seattle, WA 98105'
          fetchDetails={true}
          minLength={3}
          textInputProps={{
            onChangeText: (text) => setShowAutocomplete(text.length >= 3) // Update showAutocomplete based on input length
          }}
          onPress={(data, details = null) => {
            bottomSheetRef.current?.close();
            if (details) {
              const addressComponents = details.address_components;
              const address1 = `${addressComponents.find(c => c.types.includes('street_number'))?.long_name} ${addressComponents.find(c => c.types.includes('route'))?.long_name}`;
              const address2 = addressComponents.find(c => c.types.includes('subpremise'))?.long_name || ''; // This line is new
              const city = addressComponents.find(c => c.types.includes('locality'))?.long_name;
              const state = addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name;
              const country = addressComponents.find(c => c.types.includes('country'))?.short_name;
              const zip = addressComponents.find(c => c.types.includes('postal_code'))?.long_name;
              const addressDict = {
                address1: address1,
                address2: address2,
                city: city,
                state: state,
                country: country,
                zip: zip
              };

              setDefaultAddress(addressDict);
            }
          }}
          query={{
            key: config.googlePlacesAutocompleteKey,
            language: 'en',
            location: '47.6645226,-122.3128206', // Latitude and longitude for REV Delivery
            radius: '5000', // 
            components: 'country:us',
            strictbounds: true, // this would make it so that nothing outside of the range would be available
          }}

          styles={{
            container: {
              diplay: 'flex',
              width: '100%',
              height: 300,
              zIndex: 5
            },
            textInput: {
              height: 38,
              color: '#000000',
              backgroundColor: '#F0F0F0',
              fontSize: 16,
              borderWidth: 1,
              borderColor: '#4B2D83',
              borderRadius: 5,
              // paddingHorizontal: 10,
              paddingLeft: 4,
              paddingRight: 6,

              // backgroundColor: '#4B2D83',
            },
            // the autofill text
            description: {
              fontWeight: '400'
            },
            predefinedPlacesDescription: {
              color: '#1faadb',
            },
            textInputPlaceholder: { // This is the style property for the placeholder text
              color: '#FFFFFF',
              fontSize: 16,
            },
          }}

          numberOfLines={3}
        />



        {!showAutocomplete && <Image
          source={require('../assets/Delivery_Range.png')}
          style={{ width: 490, height: 490, marginTop: !showAutocomplete ? (50) : (200) }}
          resizeMode="contain"
        />}




        {/* <View style={{ backgroundColor: '#4B2D83', width: '90%', marginLeft: 'auto', marginRight: 'auto', height: 1, borderRadius: 30 }} />
        <View style={{ position: 'absolute', backgroundColor: '#4B2D83', width: '90%', marginLeft: 'auto', marginRight: 'auto', height: 1, borderRadius: 30 }} /> */}
      </View>
    );
  };



  interface Address {
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  }

  // figure out the diff in the province/state issue bt pages
  const formatAddress = (address: Address) => {
    const { address1, address2, city, state, country, zip } = address;
    // console.log(address)
    // console.log(address);
    const parts = [
      address1 && address1.length !== 0 ? address1 : '',
      address2 && address2.length !== 0 && address2 !== 'undefined' ? `, ${address2}` : '',
      city && city.length !== 0 ? `, ${city}` : '',
      province && province.code ? `, ${province.code}` : '',
      zip && zip.length !== 0 ? `, ${zip}` : '',
    ];
    // console.log(parts)
    return parts.join('');
  };

  useEffect(() => {
    // getCustomerAddress()
    const grabAddress = async () => {
      getCustomerAddress()
    }
    grabAddress()
  }, [userToken])

  useEffect(() => {
    if (defaultAddress && Object.keys(defaultAddress).length > 0) {
      updateCustomerAddress();
    }
  }, [defaultAddress]);

  useEffect(() => {
    if (defaultAddress) {
      setAddress1(defaultAddress.address1);
      setAddress2(defaultAddress.address2);
      setCity(defaultAddress.city);
      setProvince({ code: defaultAddress.province, province: defaultAddress.province });
      setZip(defaultAddress.zip);
    }
  }, [defaultAddress]);

  // const sendToCheckOut = (shippingRate: { handle: any; title?: string; price?: { amount: number; currencyCode: string } }) => {
  //   setSelectedRateHandle(shippingRate.handle)
  //   updateShippingOption()
  // }


  return (
    <>
      {/* <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'position' : 'height'} style={{ flex: 1 }}> */}
      <LinearGradient colors={['#FFFFFF', '#D9D9D9', '#FFFFFF']} style={{ display: 'flex', width: '100%', height: '95%', marginTop: 8 }}>

        {/* Container */}
        <View style={{ flex: 1, justifyContent: 'space-between', height: '100%' }}>

          {/* top section */}
          <View style={{
            display: 'flex',
            height: 60,
            // marginBottom: 30,
            alignItems: 'center',
          }}>
            {/* review order and price component */}

            {/* old pricing component */}
            {/* <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 0, paddingTop: 20, width: '90%' }}>
              <Text style={{ textAlign: 'left', color: '#4B2D83', fontSize: 18, fontWeight: '800' }}>Total</Text>
              <Text style={{ textAlign: 'right', color: '#4B2D83', fontSize: 18, fontWeight: '800' }}>${totalPrice.toFixed(2)}</Text>
            </View> */}

            {/* address field */}
            <TouchableOpacity style={styles.addressBox} onPress={() => bottomSheetRef.current?.expand()}>

              {defaultAddress ?
                // if address selected
                (
                  <View style={{
                    width: '100%',
                    backgroundColor: '#D9D9D9',
                    borderTopRightRadius: 25, borderBottomRightRadius: 25, paddingTop: 5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: 'row',
                    marginTop: 8,
                  }}>
                    <View style={{ marginLeft: 20, marginBottom: 4 }}>
                      <PinIcon size={24} color='black' />
                    </View>

                    <View style={{ width: '75%' }}>
                      <Text style={{ paddingLeft: 6, fontSize: 14, fontWeight: 'bold', color: '#4B2D83' }}>
                        Delivering to:
                      </Text>
                      <Text numberOfLines={1} ellipsizeMode='tail' style={{ paddingLeft: 6, paddingBottom: 7, fontSize: 14, width: '100%' }}>
                        {formatAddress(defaultAddress)}
                      </Text>

                    </View>
                    <View style={{ display: 'flex', marginRight: 12, marginTop: 12, }}>
                      <ChevronDownIcon color='#4B2D83' size={25} />
                    </View>
                  </View>
                )
                // address not selected
                : (
                  <>
                    <View style={{
                      width: '100%',
                      backgroundColor: '#D9D9D9',
                      // backgroundColor: 'yellow',
                      borderTopRightRadius: 25, borderBottomRightRadius: 25, paddingTop: 5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexDirection: 'row',
                      marginTop: 10,
                    }}>
                      <View style={{ marginLeft: 20, marginBottom: 4 }}>
                        <PinIcon size={24} color='black' />
                      </View>

                      <View style={{ width: '75%', }}>
                        <Text style={{ fontSize: 18, color: 'black', fontWeight: '500', marginBottom: 4, marginLeft: 10 }}>
                          Select Delivery Address
                        </Text>
                      </View>

                      <View style={{ display: 'flex', marginRight: 12, marginTop: 12, }}>
                        <ChevronDownIcon color='#4B2D83' size={25} />
                      </View>
                    </View>
                  </>
                )
              }
            </TouchableOpacity>
          </View>

          {/* bottom section */}
          {/* <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', }}> */}
          {/* notes */}
          {/* took out the input field because that info doesnt go anywhere. Not an option on the web checkout */}
          {/* in a v2 we could put this back in there and do checkout from here? */}
          {/* <View style={{ width: '90%' }}>
              <Text style={{ color: '#4B2D83', fontSize: 15, fontWeight: '800', marginBottom: 10 }}>Leave a Message</Text>
              <Text></Text>
              <TextInput
                placeholder='Apt #, door code, etc.'
                placeholderTextColor={'#9d9da1'}
                keyboardType='default'
                style={{
                  width: '100%',
                  // display: 'flex', flexDirection: 'column', 
                  height: 190, borderRadius: 15, backgroundColor: '#FFFFFF',
                  // padding: 20,
                  // paddingVertical: 100,   // Vertical padding (top and bottom)
                  paddingLeft: 10, // Horizontal padding (left and right)
                  // selection: {start: 1, end: 10},
                  // paddingVertical: 50,
                  borderWidth: 1, borderColor: '#D9D9D9',
                  // textAlign: 'left',
                  // textAlignVertical: 'top',

                }}
                onChangeText={(text) => setOrderNotes(text)}
                value={orderNotes}
                multiline={true}
              />
            </View> */}

          {/* middle section */}
          {/* <View style={{ display: 'flex', width: '80%', height: '30%', flexDirection: 'column', alignSelf: 'center' }}>

            <View style={{ display: 'flex', width: '80%', height: '30%', flexDirection: 'column', alignSelf: 'center' }}>
              <Text style={{ marginLeft: 2, marginBottom: 4 }}>
                Any notes for our racers?
              </Text>
              <TextInput style={{ width: '100%', alignSelf: 'center', height: 100, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: 'black', padding: 6 }}
                onChangeText={setOrderNotes}
                value={orderNotes}
                placeholder=" XD "
                multiline={true}
              />
            </View>

            <View>
              <Text>
                Any tips for our racers?
              </Text>
            </View>

          </View> */}


          {/* middle container */}
          <View style={{
            alignSelf: 'center', display: 'flex', flexDirection: 'column', width: '90%', justifyContent: 'space-between', height: '60%',
          }}>
            {/* this is for selecting the delivery method */}
            <View style={{ marginTop: 0, width: '100%', alignItems: 'center' }}>
              <Text style={{ marginLeft: 4, marginBottom: 8, fontWeight: '600', fontStyle: 'italic', fontSize: 16, alignSelf: 'flex-start', }}>Select Delivery Method</Text>

              <View style={{ display: 'flex', flexDirection: 'row', width: '80%', borderColor: 'gray', borderWidth: 1, height: 40, borderRadius: 30 }}>
                <TouchableOpacity style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  width: '50%', backgroundColor: selectedDeliveryMethod === 'Delivery' ? config.primaryColor : 'transparent', borderTopLeftRadius: 30, borderBottomLeftRadius: 30
                }} onPress={() => setSelectedDeliveryMethod('Delivery')}>
                  <Text style={{ color: selectedDeliveryMethod !== 'Delivery' ? config.primaryColor : 'white', fontWeight: '600', fontSize: 18 }}>
                    Delivery
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  width: '50%', backgroundColor: selectedDeliveryMethod === 'Pickup' ? config.primaryColor : 'transparent',
                  borderTopRightRadius: 30, borderBottomRightRadius: 30
                }} onPress={() => setSelectedDeliveryMethod('Pickup')}>
                  <Text style={{ color: selectedDeliveryMethod !== 'Pickup' ? config.primaryColor : 'white', fontWeight: '600', fontSize: 18 }}>
                    Pickup
                  </Text>
                </TouchableOpacity>
              </View>
            </View>


            {/* ORDER NOTES */}
            <View style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ marginLeft: 4, marginBottom: 8, fontWeight: '600', fontStyle: 'italic', fontSize: 16 }}>
                Any notes for our drivers?
              </Text>
              <ScrollView
                keyboardShouldPersistTaps="never"
                scrollEnabled={false}
              >

                <TextInput style={{
                  width: '90%', alignSelf: 'center', height: 100,
                  borderRadius: 8, borderWidth: 1, borderColor: 'gray', padding: 6
                }}
                  onChangeText={setOrderNotes}
                  value={orderNotes}
                  placeholder="They will see these..."
                  multiline={true}
                  blurOnSubmit={true}
                  returnKeyType="done"
                />
              </ScrollView>

            </View>

            {/* tip container */}
            <View >
              <Text style={{ marginLeft: 4, marginBottom: 8, fontWeight: '600', fontStyle: 'italic', fontSize: 16 }}>Tip?</Text>

              <View style={{ width: '90%', height: 50, borderWidth: 1, borderColor: 'gray', display: 'flex', flexDirection: 'row', alignSelf: 'center', borderRadius: 12 }}>
                {/* no tip */}
                <TouchableOpacity style={{ width: '20%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: selectedTipIndex === 0 ? config.primaryColor : 'transparent', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }} onPress={() => setSelectedTipIndex(0)}>
                  <Text style={{ color: selectedTipIndex !== 0 ? config.primaryColor : 'white', fontWeight: '500', fontSize: 16, marginBottom: -1 }}>No</Text>
                </TouchableOpacity>

                {/* $1 */}
                <TouchableOpacity style={{ width: '20%', borderLeftWidth: 1, justifyContent: 'center', alignItems: 'center', borderColor: 'gray', backgroundColor: selectedTipIndex === 1 ? config.primaryColor : 'transparent' }} onPress={() => setSelectedTipIndex(1)}>
                  <Text style={{ color: selectedTipIndex !== 1 ? config.primaryColor : 'white', fontWeight: '600', fontSize: 16 }}>$1</Text>
                </TouchableOpacity>


                {/* $2 */}
                <TouchableOpacity style={{ width: '20%', borderLeftWidth: 1, justifyContent: 'center', alignItems: 'center', borderColor: 'gray', backgroundColor: selectedTipIndex === 2 ? config.primaryColor : 'transparent', }} onPress={() => setSelectedTipIndex(2)}>
                  <Text style={{ color: selectedTipIndex !== 2 ? config.primaryColor : 'white', fontWeight: '600', fontSize: 16 }}>$2</Text>
                </TouchableOpacity>

                {/* $3 */}
                <TouchableOpacity style={{ width: '20%', borderLeftWidth: 1, justifyContent: 'center', alignItems: 'center', borderColor: 'gray', backgroundColor: selectedTipIndex === 3 ? config.primaryColor : 'transparent' }} onPress={() => setSelectedTipIndex(3)}>
                  <Text style={{ color: selectedTipIndex !== 3 ? config.primaryColor : 'white', fontWeight: '600', fontSize: 16 }}>$3</Text>
                </TouchableOpacity>

                {/* custom */}
                <TouchableOpacity style={{ width: '20%', borderLeftWidth: 1, justifyContent: 'center', alignItems: 'center', borderColor: 'gray', backgroundColor: selectedTipIndex === 4 ? config.primaryColor : 'transparent', borderTopRightRadius: 10, borderBottomRightRadius: 10 }} onPress={() => {
                  setSelectedTipIndex(4);
                }} >
                  {/* <Text style={{ color: selectedTipIndex !== 4 ? config.primaryColor : 'white', fontWeight: '600', fontSize: 18 }}>$5</Text> */}
                  {/* i tried lol */}
                  {selectedTipIndex !== 4 ? (<Text style={{ color: selectedTipIndex !== 4 ? config.primaryColor : 'white', fontWeight: '600', fontSize: 14 }}>Custom</Text>) :

                    (<View>
                      <PriceInput onCustomTipChange={handleCustomTipChange} />
                    </View>

                    )}

                </TouchableOpacity>
              </View>

            </View>

            {/* discount code container */}
            {/* <View style={{ width: '95%', height: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
              <Text style={{ marginLeft: 4, marginBottom: 8, fontWeight: '600', fontStyle: 'italic', fontSize: 16, marginTop: 12 }}>Got a discount code?</Text>
              <TextInput
                style={{ width: 100, height: 40, borderRadius: 8, borderColor: 'gray', borderWidth: 1, paddingHorizontal: 20 }}
                onChangeText={setDiscountCode}
                value={discountCode}
                placeholder="CODE"
                multiline={false}
              />
            </View> */}

            <View style={{ marginTop: 18 }}>
              <Text style={[styles.error]}>
                {errorMessage}
              </Text>
            </View>

          </View>


          {/* lower section */}
          <View style={{
            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
            // height: '40%'
          }}>
            {/* this is the pricing breakdown */}

            <View style={{ width: '90%', alignSelf: 'center' }}>
              {/* subtotal */}
              <View style={
                styles.pricingBreakdownContainer
              }>
                <Text style={{ textAlign: 'left', color: 'gray', fontSize: 16, fontWeight: '600' }}>Subtotal</Text>
                <Text style={{ textAlign: 'right', color: 'gray', fontSize: 16, fontWeight: '600' }}>
                  {/* {subtotal.toFixed(2)} */}
                  {subtotal.toFixed(2)}
                </Text>

              </View>
              {/* <View style={{
              backgroundColor: 'red', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
            }}>
              
            </View> */}


              {/* tax */}

              {/* shipping */}
              <View style={
                styles.pricingBreakdownContainer
              }>
                <Text style={{ textAlign: 'left', color: 'gray', fontSize: 16, fontWeight: '600' }}>Delivery</Text>
                <Text style={{ textAlign: 'right', color: 'gray', fontSize: 16, fontWeight: '600' }}>
                  {/* dont need to fixed 2 lol */}
                  {deliveryFee.toFixed(2)}

                </Text>
              </View>

              {/* tip */}
              <View style={
                styles.pricingBreakdownContainer
              }>
                <Text style={{ textAlign: 'left', color: 'gray', fontSize: 16, fontWeight: '600' }}>Tip</Text>
                <Text style={{ textAlign: 'right', color: 'gray', fontSize: 16, fontWeight: '600' }}>
                  {tip.toFixed(2)}
                  {/* {tip} */}

                </Text>
              </View>

              {/* taxes */}
              <View style={
                styles.pricingBreakdownContainer
              }>
                <Text style={{ textAlign: 'left', color: 'gray', fontSize: 16, fontWeight: '600' }}>Tax</Text>
                <Text style={{ textAlign: 'right', color: 'gray', fontSize: 16, fontWeight: '600' }}>
                  {tax.toFixed(2)}
                </Text>
              </View>

              {/* total */}
              {/* tip + shipping + tax + subtotal */}
              <View style={
                styles.pricingBreakdownContainer
              }>
                <Text style={{ textAlign: 'left', color: 'black', fontSize: 18, fontWeight: '800' }}>Total</Text>
                <Text style={{ textAlign: 'right', color: 'black', fontSize: 18, fontWeight: '800' }}>
                  ${total?.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.checkoutContainer}>

              {loading || !ready ? (<View style={styles.checkoutClosed}>

                <ActivityIndicator />
              </View>) : (<TouchableOpacity style={styles.checkoutButton} onPress={handleNewCheckout}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>Checkout</Text>
              </TouchableOpacity>)}

            </View>


            {/* this was our old checkout */}
            {/* <View style={[styles.checkoutContainer, { height: errorMessage.length != 0 ? 68 : 50, marginBottom: 10 }]}>

              {errorMessage.length != 0 &&
                <Text style={styles.error}>{errorMessage}</Text>
              }
              {isLoading ? (<TouchableOpacity style={styles.checkoutButton} >
                <ActivityIndicator size='small' />

              </TouchableOpacity>)
                // TODO CHANGE THIS ONPRESS TO PULL UP WEBURL

                : isClosed || totalPrice < 6 ? (<View style={styles.checkoutClosed}> {totalPrice < 6 ? (<Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>$6 Minimum Order</Text>) : (<Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>We're closed</Text>)}</View>) : (<TouchableOpacity style={styles.checkoutButton} onPress={sendToCheckout}>

                  <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>Checkout</Text>
                </TouchableOpacity>)}
            </View> */}
          </View>
          {/* checkout button */}

        </View >
        {/* </KeyboardAvoidingView > */}
      </LinearGradient >

      <BottomSheet
        ref={bottomSheetRef}
        index={-1} // Start closed
        enablePanDownToClose
        snapPoints={['90%']} // Set the heights of the bottom sheet
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            // height: '90%',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 10,
          }}
        >
          <View style={{ flex: 1, justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'center' }}>
            {/* upper container */}
            <View style={{
              display: 'flex', flexDirection: 'column',
              // alignItems: 'flex-start', justifyContent: 'center', 
              height: 250, width: '100%'
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#4B2D83' }}>
                Where to?
              </Text>
              <GooglePlacesInput />
            </View>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet >
    </>
  )
}

export default ShippingAddress

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    paddingBottom: Platform.OS == 'ios' ? 280 : 20,
    backgroundColor: '#D9D9D9',
  },
  input: {
    // marginTop: 16,
    // fontSize: 16,
    // borderBottomWidth: 0.5,
    // borderColor: theme.colors.text,
    // padding: 5,
    // paddingHorizontal: 4,
    // color: theme.colors.text
  },
  countyPickerView: {
    marginTop: 16,
    borderBottomWidth: 0.5,
    borderColor: theme.colors.text,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  county: {
    fontSize: 16
  },
  text: {
    color: theme.colors.text
  },
  provinceOptionTitle: {
    color: theme.colors.infoText,
    letterSpacing: 0.6,
    paddingVertical: 3
  },
  checkoutContainer: {
    // backgroundColor: theme.colors.background,
    borderColor: theme.colors.infoText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,

    width: '100%'
  },
  provinceOptionsContainer: {
    alignItems: 'center',
    paddingTop: 16
  },
  error: {
    alignSelf: 'flex-start',
    color: 'red',
    marginBottom: 10,
    letterSpacing: 0.2
  },
  textDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: 'black',
    letterSpacing: 1,
    paddingBottom: 8,
  },
  image: {
    width: '50%',
    height: '50%',
    resizeMode: 'contain',
  },
  checkoutButton: {
    marginTop: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#4B2D83',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  checkoutClosed: {
    marginTop: 5,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'gray',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
  },

  addressBox: {
    // height: 40,
    borderColor: 'black',
    // borderWidth: 1,
    borderRadius: 20,
    marginBottom: 4,
    flexDirection: 'row',
    // marginTop: '2%',
    alignSelf: 'flex-start',
    width: '95%',
    justifyContent: 'flex-start', // Add this line to center content vertically
    // borderBottomWidth: 2,
    // borderBottomColor: '#4B2D83',
  },
  pricingBreakdownContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8
  }
})