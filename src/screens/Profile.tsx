import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Image, Touchable } from 'react-native'
import React, { useEffect, useState } from 'react'
import { theme } from '../constants/theme'
import { ProfileStackParamList } from '../types/navigation'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Entypo } from '@expo/vector-icons'
import { ScrollView } from 'react-native-gesture-handler'
import { useNavigationContext } from '../context/NavigationContext'
import { useAuthContext } from '../context/AuthContext'
import * as WebBrowser from 'expo-web-browser'
import { config } from '../../config'
import { MailIcon, RightArrowIcon } from '../components/shared/Icons'
import { useCartContext } from '../context/CartContext'
import phone from '../assets/phone.png'
import { storefrontApiClient } from '../utils/storefrontApiClient'
import { Order } from '../types/dataTypes'
import fonts from '../../App'
import { stores } from '../utils/schoolObjects'
import { useLocations } from '../context/LocationsContext'

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>

const Profile = ({ navigation }: Props) => {
  const { userToken, signOut } = useAuthContext()
  const { rootNavigation } = useNavigationContext()
  const { getItemsCount, getTotalPrice, cartItems } = useCartContext()
  const [isLoading, setIsLoading] = useState<Boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [numOrders, setNumOrders] = useState<number>(0);
  const { selectedLocation, isLoading: isLoadingLocations, resetLocation } = useLocations();



  const [storeHours, setStoreHours] = useState<string>('');

  useEffect(() => {
    setStoreHours(selectedLocation.storeHours)
  }, [selectedLocation])


  // useEffect(() => {
  //   navigation.setOptions({
  //     headerRight: () => (
  //       <>
  //         {userToken ?
  //           <TouchableOpacity onPress={() => signOut()}>
  //             <Text style={styles.textButton}>LOG OUT</Text>
  //           </TouchableOpacity> :
  //           <TouchableOpacity onPress={() => rootNavigation.push('LoginStackNavigator', { screen: 'Login' })}>
  //             <Text style={styles.textButton}>LOG IN</Text>
  //           </TouchableOpacity>
  //         }
  //       </>
  //     )
  //   })
  // }, [userToken])

  // const deleteAccount = () => {
  //   Alert.alert(
  //     'Delete Account',
  //     'Are you sure that you want to delete your account? Please note that there is no option to restore your account or its data. You would still be able to check your order status using its order number.',
  //     [
  //       {
  //         text: 'Delete Account',
  //         style: 'destructive',
  //         onPress: () => signOut()
  //       },
  //       {
  //         text: 'Cancel',
  //         style: 'cancel'
  //       }
  //     ]
  //   )
  // }



  const fetchOrderCount = async () => {
    setIsLoading(true)
    setErrorMessage('')

    if (!userToken) {
      setIsLoading(false)
      return
    }

    const query = `query {
      customer(customerAccessToken: "${userToken.accessToken}") {
        orders(first: 1) {
          totalCount
        }
      }
    }`

    try {
      const response: any = await storefrontApiClient(query)

      if (response.errors && response.errors.length != 0) {
        throw response.errors[0].message
      }
      // console.log(response.data.customer.orders.totalCount)
      setNumOrders(response.data.customer.orders.totalCount)
    } catch (e) {

      if (typeof e == 'string') {
        setErrorMessage(e)
      } else {
        setErrorMessage('Something went wrong. Try again.')
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchOrderCount()
  }, [])

  const handleEmailPress = () => {
    const emailAddress = 'team@rev.delivery' // could add things like subject and message if you wanted to get spicy
    const mailToLink = `mailto:${emailAddress}`
    Linking.openURL(mailToLink)
      .catch((err) => {
        console.error('Failed to open email app:', err);
        Alert.alert('Oops! We couldn\'t find your email app', 'Please try manually inputting team@rev.delivery');
      });
    // try {
    //   Linking.openURL(mailToLink)
    // } catch (e) {
    //   Alert.alert('Oops')
    // }

  }

  // if calling is supported, we will call the number. If not supported, we will text the number
  const handlePhonePress = () => {
    // console.log('phone has been pressed')
    // local format, not international
    // const phoneNumber = '(206)833-6358';
    const phoneNumber = '2068336358' // rev number
    const callLink = `tel:${phoneNumber.replace(/[^\d+]/g, '')}`

    const smsLink = `sms:${phoneNumber.replace(/[^\d+]/g, '')}`
    Linking.openURL(callLink).catch()
    try {
      Linking.canOpenURL(callLink).then((supported) => {
        if (supported) {
          Linking.openURL(callLink).catch()
        } else {
          Linking.openURL(smsLink).catch()
        }
      })
    } catch (e) {
      Alert.alert('Oops! Please try again later or manually enter the phone number')
    }


  }

  return (

    <View style={styles.container}>
      {/* upper */}
      {userToken ? (<View>
        {/* Hi, Username */}
        <Text
          style={{ fontSize: 20, marginVertical: 8, fontWeight: 'bold', color: '#4B2D83', }}
        >Hi, {userToken?.customer.firstName}</Text>





        {/* FEATURES COMING SOON */}
        {/* using 0.5 hours per order? */}
        {/* using 0.8 because 400g (0.4kg) of co2 emitted per mile of driving */}
        {/* TODO UPDATE THIS, should not be based on items count */}
        <Text style={{ marginBottom: 40, fontSize: 13, fontWeight: '300' }}>
          You saved {numOrders * 0.5} hours shopping and prevented {Math.round((numOrders * 0.8) * 100) / 100} kg of carbon emissions!
        </Text>

        {/* REVPASS COMING SOON */}
        {/* <TouchableOpacity style={{
          backgroundColor: '#FFFFFF', borderRadius: 8, height: 50, display: 'flex', justifyContent: 'center',
          marginBottom: 40,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6, shadowColor: '#4B2D83'
        }}>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            <Text style={{ fontWeight: 'bold', color: '#4B2D83', fontSize: 18, marginLeft: 10 }}>
              REV Pass & Rewards{" "}
            </Text>
            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>
              Coming Soon!
            </Text>
          </View>
        </TouchableOpacity > */}

        {/* REV REWARDS Coming Soon! */}
        {/* <TouchableOpacity style={{
          backgroundColor: '#FFFFFF', borderRadius: 8, height: 100, display: 'flex', justifyContent: 'space-between',
          shadowColor: 'black', shadowRadius: 2,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          marginBottom: 18
        }}>
          <View style={{}}>
            <Text style={{ fontWeight: '700', color: '#4B2D83', fontSize: 18, marginLeft: 16, marginTop: 24, }}>
              Invite friends, earn $$$
            </Text>
            <Text style={{ fontWeight: '300', color: 'black', fontSize: 18, marginLeft: 16, marginTop: 6 }}>
              REV Rewards coming soon!
            </Text>
          </View>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
          </View>
        </TouchableOpacity > */}
      </View>) : (

        <View style={{ width: '100%', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => rootNavigation.navigate('LoginStackNavigator', {
            screen: 'Login',
          })} style={{ backgroundColor: config.primaryColor, width: '70%', justifyContent: 'center', alignItems: 'center', height: 45, borderRadius: 30 }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>Log In</Text>
          </TouchableOpacity>
        </View>

      )}



      {/* Lower */}
      <View style={{ flex: 1, justifyContent: 'flex-start', flexDirection: 'column', marginBottom: 75 }} >
        {/* STORE HOURS */}
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

        {/* CONTACT US */}
        <View style={{
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          height: 130,
          marginBottom: 24,
          // borderWidth: 1,
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
          shadowColor: 'black', shadowRadius: 1,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6
        }}>
          <View style={{ display: 'flex', marginLeft: 12, marginTop: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#4B2D83' }}>
              Contact Us
            </Text>
            <View style={{ marginLeft: 8, marginTop: 16, flex: 1, flexDirection: 'column', justifyContent: 'space-between', marginBottom: 20 }}>
              {/* MAIL CONTAINER */}
              <View style={{ display: 'flex', flexDirection: 'row' }}>
                <View style={{ justifyContent: 'center', marginRight: 6, marginTop: 2 }}>
                  <MailIcon color={'black'} size={20} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', }}>
                  <Text onPress={() => handleEmailPress()} style={{ fontSize: 18, fontWeight: '300', textDecorationLine: 'underline', }}>team@rev.delivery</Text>
                  <Text style={{ fontSize: 14, fontWeight: '300', }} numberOfLines={1} > for business inquiries</Text>
                </View>

              </View>

              <View style={{ width: 250, height: 1, borderRadius: 2, backgroundColor: '#3C3C4333' }}></View>

              {/* Phone container */}
              <View style={{ display: 'flex', flexDirection: 'row' }}>
                <Image source={phone} style={{ width: 20, height: 20, marginRight: 2 }} />
                <Text onPress={handlePhonePress} style={{ fontSize: 18, fontWeight: '300', textDecorationLine: 'underline' }}>(206)833-6358</Text>
              </View>

            </View>

          </View>
        </View>




        {/* View other stores */}
        {/* <Text>You are currently viewing {stores[selectedLocation.name].name}</Text> */}
        {/* <TouchableOpacity style={styles.cardContainer}
          onPress={() => resetLocation()}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', marginLeft: 26 }}>View other locations</Text>
          <View style={{ marginRight: 4 }}>
            <RightArrowIcon size={40} color={'#4B2D83'} />
          </View>
        </TouchableOpacity> */}

        {/* JOIN THE TEAM */}
        <TouchableOpacity
          style={styles.cardContainer}
          onPress={() => {
            Linking.openURL('https://form.jotform.com/240597752831060')
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: 'bold', marginLeft: 26 }}>Join the Team</Text>
          {/* <Entypo name={`chevron-small-right`} size={40} color={'#4B2D83'} /> */}
          <View style={{ marginRight: 4 }}>
            <RightArrowIcon size={40} color={'#4B2D83'} />
          </View>
        </TouchableOpacity>
      </View>


    </View >
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    width: '96%',
    alignSelf: 'center',
    marginTop: 12,
    // backgroundColor: '#f2f2f2',
    flexDirection: 'column',
    // justifyContent: 'space-between',
  },
  greeting: {
    color: theme.colors.text,
    fontSize: 20,
    letterSpacing: 1,
    // marginBottom: 32
  },
  text: {
    color: theme.colors.text
  },
  textButton: {
    color: theme.colors.text,
    letterSpacing: 0.5,
    fontSize: 15,
    fontWeight: '500'
  },
  subTitle: {
    color: theme.colors.infoText,
    letterSpacing: 1,
  },
  settingTitle: {
    color: '#000000',
    letterSpacing: 1,
    fontSize: 18,
    fontWeight: 'bold',
    paddingVertical: 8
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    marginBottom: 15,
    // borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: 'black', shadowRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6

  }
})

export default Profile