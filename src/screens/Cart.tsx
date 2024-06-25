import { View, Text, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Keyboard, Platform, ScrollView, SafeAreaView } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { theme } from '../constants/theme'
import { storefrontApiClient } from '../utils/storefrontApiClient'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { CartStackParamList } from '../types/navigation'
import { useCartContext } from '../context/CartContext'
import { FlatList, TextInput, TouchableWithoutFeedback } from 'react-native-gesture-handler'
import CartCard from '../components/cart/CartCard'
import FillButton from '../components/shared/FillButton'
import { useNavigationContext } from '../context/NavigationContext'
import { useAuthContext } from '../context/AuthContext'
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from '@gorhom/bottom-sheet'
import { useStoreClosed } from '../context/StoreClosedContext'
import { config } from '../../config'
import { useLocations } from '../context/LocationsContext'
import { createDiffieHellmanGroup } from 'crypto'

type Props = NativeStackScreenProps<CartStackParamList, 'Cart'>

const Cart = ({ navigation }: Props) => {
  const { getItemsCount, getTotalPrice, cartItems } = useCartContext()
  const { userToken } = useAuthContext()
  const { userContinueAnyways } = useStoreClosed();
  const { rootNavigation } = useNavigationContext()
  const subtotal = getTotalPrice()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const { selectedLocation, isLoading: isLoadingLocations, resetLocation, isLocationOpen } = useLocations();
  const [discountCode, setDiscountCode] = useState<string>('')
  // const scrollRef = useRef<ScrollView>()
  const TextInputRef = useRef(null)

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        // <Text style={styles.screenTitle}>Cart ({getItemsCount()})</Text>
        <Image source={require('../assets/BAG.png')} style={{ height: 25, width: 100, marginTop: 4 }} resizeMode='contain' />
      )
    })
  }, [getItemsCount])

  const [storeHours, setStoreHours] = useState<string>('');

  useEffect(() => {
    setStoreHours(selectedLocation.storeHours)
  }, [selectedLocation])

  const handleCodeChange = (userInput: string): void => {
    setDiscountCode(userInput.toUpperCase());
  }

  // const createCheckout = async () => {
  //   const isOpenNow = await isLocationOpen(selectedLocation.id)
  //   if (!isOpenNow) {
  //     setErrorMessage('Too late! We are now closed')
  //     return
  //   }

  //   setIsLoading(true)
  //   setErrorMessage('')
  //   if (subtotal < 6) {
  //     console.log('subtotal', subtotal)
  //     setIsLoading(false)
  //     return;
  //   }

  //   try {
  //     const query = `mutation checkoutCreate($input: CheckoutCreateInput!) {
  //       checkoutCreate(input: $input) {
  //         checkout {
  //           id
  //         }
  //         checkoutUserErrors {
  //           code
  //           field
  //           message
  //         }
  //       }
  //     }`

  //     const variables = {
  //       input: {
  //         "allowPartialAddresses": true,
  //         "lineItems": cartItems.map((item) => (
  //           {
  //             variantId: item.id,
  //             quantity: item.quantity
  //           }
  //         )),
  //         "discountCodes": [ // case insensitive--no worries
  //           discountCode
  //         ]
  //       }
  //     }

  //     const response: any = await storefrontApiClient(query, variables)

  //     if (response.errors && response.errors.length != 0) {
  //       setIsLoading(false)
  //       throw response.errors[0].message
  //     }

  //     if (response.data.checkoutCreate.checkoutUserErrors && response.data.checkoutCreate.checkoutUserErrors.length != 0) {
  //       setIsLoading(false)
  //       throw response.data.checkoutCreate.checkoutUserErrors[0].message
  //     }

  //     if (userToken) {
  //       const query2 = `mutation checkoutCustomerAssociateV2($checkoutId: ID!, $customerAccessToken: String!) {
  //         checkoutCustomerAssociateV2(checkoutId: $checkoutId, customerAccessToken: $customerAccessToken) {
  //           checkout {
  //             id
  //           }
  //           checkoutUserErrors {
  //             code
  //             field
  //             message
  //           }
  //           customer {
  //             id
  //           }
  //         }
  //       }`

  //       const variables2 = {
  //         checkoutId: response.data.checkoutCreate.checkout.id,
  //         customerAccessToken: userToken.accessToken
  //       }

  //       const response2: any = await storefrontApiClient(query2, variables2)

  //       if (response2.errors && response2.errors.length != 0) {
  //         // console.log('Associate customer failed.')
  //         // console.log(response2.errors[0].message)
  //       }
  //     }


  //     rootNavigation.push('ShippingAddress', { checkoutId: response.data.checkoutCreate.checkout.id, totalPrice: (subtotal) })
  //   } catch (e) {
  //     if (typeof e == 'string') {
  //       setErrorMessage(e)
  //     } else {
  //       setErrorMessage('Something went wrong. Try again.')
  //     }
  //   }
  //   setIsLoading(false)
  // }


  // here is the new create checkout function
  // uses the create cart, since createCheckout is now deprecated
  const createCheckout = async () => {
    const isOpenNow: boolean = await isLocationOpen(selectedLocation.id)
    if (!isOpenNow) {
      setErrorMessage('Too late! We are now closed')
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    if (subtotal < 6) {
      // console.log('subtotal:', subtotal)
      setIsLoading(false)
      return
    }

    try {
      // here is the query to create the cart
      const query = `mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            cost {
              checkoutChargeAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
              }
              totalTaxAmount {
                amount
                currencyCode
              }
            }
            discountCodes {
              applicable
              code
            }
          }
          userErrors {
            field
            message
          }
        }
      }`

      const variables = {
        input: {
          lines: cartItems.map((item) => ({
            merchandiseId: item.id,
            quantity: item.quantity
          })),
          discountCodes: [discountCode] // apply the discount code here
        },
      }

      const response: any = await storefrontApiClient(query, variables)
      if (response.errors && response.errors.length) {
        setIsLoading(false) // redundant but not a bad check
        // console.log(response.errors)
        setErrorMessage(response.errors[0].message)
      }

      if (response.data.cartCreate.userErrors && response.data.cartCreate.userErrors.length) {
        setIsLoading(false)
        // console.log(response.data.cartCreate.userErrors)
        // maybe we do a custom message?
        setErrorMessage(response.data.cartCreate.userErrors[0].message)
      }

      // console.log('disc codes', response.data.cartCreate.cart.discountCodes)
      // console.log('entered discount code: ', discountCode)

      // grab the subtotal, tax, and cartId from here so we can pass it in easier
      const subtotal: number = parseFloat(response.data.cartCreate.cart.cost.subtotalAmount.amount);
      const tax: number = parseFloat(response.data.cartCreate.cart.cost.totalTaxAmount.amount);
      const cartId: string = response.data.cartCreate.cart.id
      const codeSuccess: boolean = response.data.cartCreate.cart.discountCodes[0].applicable

      // console.log('subtotal:', subtotal)
      // console.log('tax:', tax)
      // console.log('cartId:', cartId)
      // console.log('codeSuccess', codeSuccess)

      if (codeSuccess || discountCode === "") {
        rootNavigation.push('ShippingAddress', { // pushing all of our uber important info!
          cartId: cartId,
          totalPrice: subtotal,
          tax: tax,
        })
      } else {
        setErrorMessage("That code didn't work or wasn't applicable to your cart")
        return;
      }
    } catch (e) {
      // console.log(e)
    } finally {
      setIsLoading(false)
    }


  }

  if (userContinueAnyways) {
    return (
      <View style={{ width: '100%', height: '30%', alignItems: 'center', marginTop: 30, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'black', fontSize: 30, fontWeight: '600' }}>
            We're closed!
          </Text>
          <Text style={{ color: 'black', fontSize: 18, fontWeight: '400', marginBottom: 20 }}>
            Check back in later
          </Text>
        </View>


        <View style={{
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          height: 100,
          marginBottom: 24,
          // borderWidth: 1,
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
          shadowColor: 'black', shadowRadius: 1,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6
        }}>
          <View style={{ display: 'flex', marginLeft: 12, marginTop: 10, }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#4B2D83' }}>
              Store Hours
            </Text>
            <View style={{ marginLeft: 8, marginTop: 4, flex: 1, flexDirection: 'column', justifyContent: 'space-between', marginBottom: 0 }}>
              <Text style={{ fontSize: 18, fontWeight: '300', flexWrap: 'wrap', lineHeight: 24 }}>
                {typeof storeHours === 'string' ? storeHours : ""}
              </Text>

              {/* <Text style={{ fontSize: 18, fontWeight: '300' }}>{storeHours}</Text>
              <Text style={{ fontSize: 18, fontWeight: '300' }}>Sunday - Thursday: 11AM - 12AM</Text>
              <View style={{ width: 250, height: 1, borderRadius: 2, backgroundColor: '#3C3C4333' }}></View>
              <Text style={{ fontSize: 18, fontWeight: '300', }}>Friday - Saturday: 11AM - 1AM</Text> */}
            </View>
          </View>
        </View>

      </View>
    )
  }

  if (!userToken) {
    return (
      <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', height: '90%', }}>
        <Text style={{ color: 'black', fontSize: 20, fontWeight: '600', marginBottom: 10 }}>
          You need an account to check out
        </Text>

        <TouchableOpacity onPress={() => rootNavigation.navigate('LoginStackNavigator', {
          screen: 'Login',
        })} style={{ backgroundColor: config.primaryColor, width: '70%', justifyContent: 'center', alignItems: 'center', height: 45, borderRadius: 30 }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>Log In</Text>
        </TouchableOpacity>

      </View >
    )
  }


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 0}
      style={{ flex: 1, }}
    >
      {/* <TouchableWithoutFeedback style={{ height: '100%' }} onPress={Keyboard.dismiss}> */}
      <LinearGradient colors={['#FFFFFF', '#D9D9D9', '#FFFFFF']} style={{ display: 'flex', height: '100%', width: '100%', marginTop: 8 }}>
        <SafeAreaView style={{ justifyContent: 'space-between', flex: 1, alignItems: 'center', }}
        // scrollEnabled={Platform.OS == 'ios' ? false : true}
        // showsVerticalScrollIndicator={false}
        // ref={scrollRef}
        // contentContainerStyle={{
        //   justifyContent: 'space-between', flex: 1, alignItems: 'center',
        // }}
        // style={{ display: 'flex', height: '100%', backgroundColor: 'yellow', }}
        // keyboardShouldPersistTaps='always'
        >
          <View style={{

            flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingTop: 10
          }}>
            <FlatList
              data={cartItems}
              renderItem={({ item }) => <CartCard cartItem={item} />}
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* this is the container for the discount code and continue button */}
          <View style={{
            width: '90%',
            display: 'flex',
            justifyContent: 'space-between',
            bottom: 10,
            height: errorMessage !== "" ? 170 : 170 - 18,
            alignItems: 'center',
            // paddingVertical: 10
            paddingTop: 12, paddingBottom: 10

          }}>
            {/* text input container */}
            <View style={{ width: '100%', borderBottomColor: errorMessage !== "" ? 'red' : 'gray', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TextInput
                // style={{ width: '60%', backgroundColor: 'transparent', borderWidth: 1, borderColor: 'gray', borderRadius: 8, height: '100%', fontSize: 20, paddingHorizontal: 12, textTransform: 'uppercase', textAlign: 'center' }}
                style={{ width: '80%', fontSize: 18, paddingVertical: 4 }}
                ref={TextInputRef}
                onChangeText={handleCodeChange}
                value={discountCode}
                placeholder="Enter a Discount Code"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete='off'
                blurOnSubmit={true}
                returnKeyType="done"
              />
              {discountCode !== "" && (<TouchableOpacity onPress={() => {
                Keyboard.dismiss;
                TextInputRef.current?.blur();
              }}>
                {/* <Text style={{ color: config.primaryColor }}>APPLY</Text> */}
              </TouchableOpacity>)}

            </View>
            {errorMessage !== "" && <Text style={{ color: 'red', textAlign: 'left' }}>{errorMessage}</Text>}

            <View style={{ width: '100%', height: 51, }}>
              <Text style={{ color: '#aaaaaa', fontSize: 8, textAlign: 'center', maxWidth: '95%', alignSelf: 'center' }}>By submitting your order, you agree to REV’s Terms of Service and Privacy Policy, including all terms related to the purchase of alcohol and vape products. If your order includes alcohol or vape products, you certify that you are of lawful age to purchase and consume such products and that you will produce a valid ID at delivery. If we are unable to verify your age, you may be charged a NON-REFUNDABLE restocking fee.</Text>
            </View>
            <View style={{ width: '100%', height: errorMessage !== "" ? '25%' : 38, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {isLoading ?
                // is not a touchable so we dont have duplicate press events
                (<View style={styles.reviewOrderContainer}>
                  <ActivityIndicator size='small' />
                </View>)
                : subtotal > 6 ? (<TouchableOpacity onPress={createCheckout} style={styles.reviewOrderContainer}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: 'white', }}>Review Order</Text>
                </TouchableOpacity>) :
                  (<View style={styles.reviewOrderContainerEmpty}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>$6 order mimimum</Text>
                  </View>)
              }
            </View>

          </View>
        </SafeAreaView>
        {/* </TouchableWithoutFeedback > */}
      </LinearGradient>
    </KeyboardAvoidingView >
  )

  return (
    <>
      {cartItems.length == 0 ?
        <LinearGradient colors={['#FFFFFF', '#D9D9D9', '#FFFFFF']} style={{ display: 'flex', height: '95%', width: '100%', marginTop: 8, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.empty}>Bag is empty</Text>
        </LinearGradient> :
        <LinearGradient colors={['#FFFFFF', '#D9D9D9', '#FFFFFF']} style={{ display: 'flex', height: '100%', width: '100%', marginTop: 8 }}>
          <FlatList
            data={cartItems}
            renderItem={({ item }) => <CartCard cartItem={item} />}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          />
          {/* <View style={[styles.checkoutContainer, { height: errorMessage.length != 0 ? 68 + 30 : 160 + 30 }]}> */}
          <View style={[styles.checkoutContainer, { height: errorMessage.length !== 0 ? 160 + 30 : 190 }]}>

            {/* // this is the container for the bottom */}
            {/* chunked by percentage. There's 5% for padding */}
            <View style={{ width: '98%', marginVertical: 2, display: 'flex', justifyContent: 'space-between' }}>




              <View style={{ width: '100%', borderBottomColor: errorMessage !== "" ? 'red' : 'gray', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TextInput
                  // style={{ width: '60%', backgroundColor: 'transparent', borderWidth: 1, borderColor: 'gray', borderRadius: 8, height: '100%', fontSize: 20, paddingHorizontal: 12, textTransform: 'uppercase', textAlign: 'center' }}
                  style={{ width: '80%', fontSize: 18, paddingVertical: 4 }}
                  onChangeText={handleCodeChange}
                  value={discountCode}
                  placeholder="Enter a Discount Code"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete='off'
                  blurOnSubmit={true}
                  returnKeyType="done"
                />
                {/* {discountCode !== "" && (<TouchableOpacity onPress={() => Keyboard.dismiss}>
                  <Text style={{ color: config.primaryColor }}>APPLY</Text>
                </TouchableOpacity>)} */}
              </View>

              <View style={{ width: '100%', height: errorMessage.length === 0 ? '0%' : '10%', display: 'flex', justifyContent: 'flex-start', }}>
                <Text style={styles.error}>{errorMessage}</Text>
                {/* <Text style={{ color: 'red' }}>Invalid discount code!</Text> */}
              </View>


              <View style={{ width: '100%', height: '30%', }}>
                <Text style={{ color: '#aaaaaa', fontSize: 8, textAlign: 'center', maxWidth: '95%', alignSelf: 'center' }}>By submitting your order, you agree to REV’s Terms of Service and Privacy Policy, including all terms related to the purchase of alcohol and vape products. If your order includes alcohol or vape products, you certify that you are of lawful age to purchase and consume such products and that you will produce a valid ID at delivery. If we are unable to verify your age, you may be charged a NON-REFUNDABLE restocking fee.</Text>
              </View>
              <View style={{ width: '100%', height: '25%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {isLoading ?
                  // is not a touchable so we dont have duplicate press events
                  (<View style={styles.reviewOrderContainer}>
                    <ActivityIndicator size='small' />
                  </View>)
                  : subtotal > 6 ? (<TouchableOpacity onPress={createCheckout} style={styles.reviewOrderContainer}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>Review Order</Text>
                  </TouchableOpacity>) :
                    (<View style={styles.reviewOrderContainerEmpty}>
                      <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>$6 order mimimum</Text>
                    </View>)
                }
              </View>
              {/* {errorMessage.length != 0 &&
                <Text style={styles.error}>{errorMessage}</Text>
              }
              <View style={{ backgroundColor: 'orange', width: '100%', height: '30%' }}></View>
              <Text style={{ color: '#aaaaaa', fontSize: 8, textAlign: 'center', lineHeight: 0, letterSpacing: 0, marginBottom: 10, paddingTop: 8 }}>By submitting your order, you agree to REV’s Terms of Service and Privacy Policy, including all terms related to the purchase of alcohol and vape products. If your order includes alcohol or vape products, you certify that you are of lawful age to purchase and consume such products and that you will produce a valid ID at delivery. If we are unable to verify your age, you may be charged a NON-REFUNDABLE restocking fee.</Text>
        
              {isLoading ? (<TouchableOpacity style={styles.reviewOrderContainer}>
                <ActivityIndicator size='small' />
              </TouchableOpacity>)
                : totalPrice > 6 ? (<TouchableOpacity onPress={createCheckout} style={styles.reviewOrderContainer}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>Review Order</Text>
                </TouchableOpacity>) : (<View style={styles.reviewOrderContainerEmpty}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>$6 order mimimum</Text>
                </View>)
              } */}
            </View>
          </View>
        </LinearGradient>
      }
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  text: {
    color: theme.colors.text
  },
  empty: {
    color: theme.colors.text,
    fontSize: 16,
    // letterSpacing: 1
  },
  checkoutContainer: {
    // borderColor: '#4B2D83',
    // borderTopWidth: 3,
    alignItems: 'center',
    paddingHorizontal: 10,
    // paddingBottom: 20
    // paddingTop: 2

  },
  error: {
    color: 'red',
  },
  screenTitle: {
    fontWeight: '900',
    letterSpacing: 1,
    color: '#4B2D83',
    fontSize: 20
  },
  reviewOrderContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#4B2D83',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  reviewOrderContainerEmpty: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  grayTextLeft: {
    flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#8a8a8e', fontSize: 15
  },
  grayTextRight: {
    flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#8a8a8e', fontSize: 15
  },
  blackTextLeft: {
    flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#000000', fontSize: 15
  },
  blackTextRight: {
    flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#000000', fontSize: 15
  },
})

export default Cart