import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native'
import React, { useEffect, useState } from 'react'
import { theme } from '../constants/theme'
import { storefrontApiClient } from '../utils/storefrontApiClient'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { CartStackParamList } from '../types/navigation'
import { useCartContext } from '../context/CartContext'
import { FlatList } from 'react-native-gesture-handler'
import CartCard from '../components/cart/CartCard'
import FillButton from '../components/shared/FillButton'
import { useNavigationContext } from '../context/NavigationContext'
import { useAuthContext } from '../context/AuthContext'
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from '@gorhom/bottom-sheet'
import { useStoreClosed } from '../context/StoreClosedContext'
import { config } from '../../config'
import { useLocations } from '../context/LocationsContext'

type Props = NativeStackScreenProps<CartStackParamList, 'Cart'>

const Cart = ({ navigation }: Props) => {
  const { getItemsCount, getTotalPrice, cartItems } = useCartContext()
  const { userToken } = useAuthContext()
  const { userContinueAnyways } = useStoreClosed();
  const { rootNavigation } = useNavigationContext()
  const totalPrice = getTotalPrice()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const { selectedLocation, isLoading: isLoadingLocations, resetLocation } = useLocations();




  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        // <Text style={styles.screenTitle}>Cart ({getItemsCount()})</Text>
        <Image source={require('../assets/BAG.png')} style={{ height: 25, width: 100, marginTop: 8 }} resizeMode='contain' />
      )
    })
  }, [getItemsCount])

  const [storeHours, setStoreHours] = useState<string>('');

  useEffect(() => {
    setStoreHours(selectedLocation.storeHours)
  }, [selectedLocation])

  const createCheckout = async () => {
    setIsLoading(true)
    setErrorMessage('')
    if (totalPrice * 1.1 + 0.99 < 6) {
      console.log(totalPrice * 1.1 + 0.99)
      setIsLoading(false)
      return;
    }

    try {
      const query = `mutation checkoutCreate($input: CheckoutCreateInput!) {
        checkoutCreate(input: $input) {
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
        input: {
          "allowPartialAddresses": true,
          "lineItems": cartItems.map((item) => (
            {
              variantId: item.id,
              quantity: item.quantity
            }
          ))
        }
      }

      const response: any = await storefrontApiClient(query, variables)

      if (response.errors && response.errors.length != 0) {
        setIsLoading(false)
        throw response.errors[0].message
      }

      if (response.data.checkoutCreate.checkoutUserErrors && response.data.checkoutCreate.checkoutUserErrors.length != 0) {
        setIsLoading(false)
        throw response.data.checkoutCreate.checkoutUserErrors[0].message
      }

      if (userToken) {
        const query2 = `mutation checkoutCustomerAssociateV2($checkoutId: ID!, $customerAccessToken: String!) {
          checkoutCustomerAssociateV2(checkoutId: $checkoutId, customerAccessToken: $customerAccessToken) {
            checkout {
              id
            }
            checkoutUserErrors {
              code
              field
              message
            }
            customer {
              id
            }
          }
        }`

        const variables2 = {
          checkoutId: response.data.checkoutCreate.checkout.id,
          customerAccessToken: userToken.accessToken
        }

        const response2: any = await storefrontApiClient(query2, variables2)

        if (response2.errors && response2.errors.length != 0) {
          // console.log('Associate customer failed.')
          // console.log(response2.errors[0].message)
        }
      }

      rootNavigation.push('ShippingAddress', { checkoutId: response.data.checkoutCreate.checkout.id, totalPrice: (totalPrice + 0.99) })

    } catch (e) {
      if (typeof e == 'string') {
        setErrorMessage(e)
      } else {
        setErrorMessage('Something went wrong. Try again.')
      }
    }

    setIsLoading(false)
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
    <>
      {cartItems.length == 0 ?
        <LinearGradient colors={['#FFFFFF', '#D9D9D9', '#FFFFFF']} style={{ display: 'flex', height: '95%', width: '100%', marginTop: 8, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.empty}>Bag is empty</Text>
        </LinearGradient> :
        <LinearGradient colors={['#FFFFFF', '#D9D9D9', '#FFFFFF']} style={{ display: 'flex', height: '98%', width: '100%', marginTop: 8 }}>
          <FlatList
            data={cartItems}
            renderItem={({ item }) => <CartCard cartItem={item} />}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          />
          <View style={[styles.checkoutContainer, { height: errorMessage.length != 0 ? 68 + 30 : 160 + 30 }]}>

            {/* // this is the container for the bottom */}
            <View style={{ width: '98%' }}>
              {errorMessage.length != 0 &&
                <Text style={styles.error}>{errorMessage}</Text>
              }

              <Text style={{ color: '#aaaaaa', fontSize: 11, textAlign: 'center', lineHeight: 15, letterSpacing: 0.2, marginBottom: 10, paddingTop: 8 }}>By submitting your order, you agree to REV’s Terms of Service and Privacy Policy, including all terms related to the purchase of alcohol and vape products. If your order includes alcohol or vape products, you certify that you are of lawful age to purchase and consume such products and that you will produce a valid ID at delivery. If we are unable to verify your age, you may be charged a NON-REFUNDABLE restocking fee.</Text>
              {/* <View style={{ flexDirection: 'column', width: '100%', alignSelf: 'center', paddingTop: 5, }}>

                <View style={{ flexDirection: 'row', paddingVertical: 4, width: '100%', justifyContent: 'space-between' }}>
                  <Text style={styles.grayTextLeft}>Subtotal</Text>
                  <Text style={styles.grayTextRight}>{parseFloat(totalPrice.toFixed(2))} USD</Text>
                </View>

                <View style={{ flexDirection: 'row', paddingVertical: 4, width: '100%', justifyContent: 'space-between' }}>
                  <Text style={styles.grayTextLeft}>Tax </Text>
                  <Text style={styles.grayTextRight}>{(totalPrice * 0.1).toFixed(2) + " "}USD</Text>
                </View>

                <View style={{ flexDirection: 'row', paddingVertical: 4, width: '100%', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={styles.grayTextLeft}>Delivery </Text>
                  <Text style={styles.grayTextRight}>{0.99} USD</Text>
                </View>

                <View style={{ flexDirection: 'row', paddingVertical: 4, width: '100%', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={styles.blackTextLeft}>Total </Text>
                  <Text style={styles.blackTextRight}>{parseFloat((totalPrice + (totalPrice * 0.1) + 0.99).toFixed(2))} USD</Text>
                </View>
              </View> */}



              {/* <FillButton
                  title='CHECKOUT'
                  onPress={createCheckout}
                /> */}
              {isLoading ? (<TouchableOpacity style={styles.reviewOrderContainer}>
                <ActivityIndicator size='small' />
              </TouchableOpacity>)
                : totalPrice * 1.1 + 0.99 > 6 ? (<TouchableOpacity onPress={createCheckout} style={styles.reviewOrderContainer}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>Review Order</Text>
                </TouchableOpacity>) : (<View style={styles.reviewOrderContainerEmpty}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: 'white' }}>$6 order mimimum</Text>
                </View>)


              }
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
    alignSelf: 'center',
    color: 'red',
    marginBottom: 4,
    letterSpacing: 1.8
  },
  screenTitle: {
    fontWeight: '900',
    letterSpacing: 1,
    color: '#4B2D83',
    fontSize: 20
  },
  reviewOrderContainer: {
    marginTop: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#4B2D83',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  reviewOrderContainerEmpty: {
    marginTop: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'gray',
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