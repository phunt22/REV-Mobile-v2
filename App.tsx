import { FlatList, GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthContext } from './src/context/AuthContext'
import { CartContext } from './src/context/CartContext'
import { NavigationContext } from './src/context/NavigationContext'
import { WishlistContext } from './src/context/WishlistContext'
import MainNavigator from './src/screens/MainNavigator'
import NetInfo from '@react-native-community/netinfo'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import noNetworkCloud from './src/assets/storm-cloud.png'
import { colorScheme, hasHomeIndicator, theme } from './src/constants/theme'
import { StatusBar } from 'expo-status-bar'
// import { fetchStoreStatus, storefrontApiClient } from './src/utils/storefrontApiClient'; // Import the storefrontApiClient
import logo from './src/assets/logo.png'
import { config } from './config'
import { storefrontApiClient } from './src/utils/storefrontApiClient'
import * as Font from 'expo-font';
import { useFonts } from 'expo-font'

import FontAwesome from '@expo/vector-icons/FontAwesome'
import { adminApiClient, checkIfPasswordProtected } from './src/utils/checkIfPasswordProtected'
import { StoreClosedProvider, useStoreClosed } from './src/context/StoreClosedContext'
import { LocationsProvider, useLocations } from './src/context/LocationsContext';

import { stores } from './src/utils/schoolObjects'
import { StripeProvider } from '@stripe/stripe-react-native'
import { REACT_APP_STRIPE_PUB_KEY } from '@env'
import OrderConfirmation from './src/screens/OrderConfirmation'




export default function App() {

  // rendering just the start, to limit the amount of renders on main app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreClosedProvider>
        <LocationsProvider>
          <StripeProvider
            publishableKey={REACT_APP_STRIPE_PUB_KEY}
            merchantIdentifier='mobile.delivery.rev'
          >
            <MainApp />
          </StripeProvider>

        </LocationsProvider>
      </StoreClosedProvider>
    </GestureHandlerRootView>
  )
}

function MainApp() {
  const [isConnected, setIsConnected] = useState(true)
  const [isLoading, setIsLoading] = useState<Boolean>(false)
  const { userContinueAnyways, setUserContinueAnyways } = useStoreClosed();


  // this is the locations information
  const { selectedLocation, isLoading: locationsLoading } = useLocations();


  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // if (state.isConnected) {
      setIsConnected(state.isConnected ?? false)
      // }
    })
    return () => unsubscribe()
  }, [])

  // if we are loading ANYTHING (etiher the network connection or the locations, then return the loading view)
  if (locationsLoading) {
    return <LoadingView />
  }



  // if no connection, then return the no connection view
  if (!isConnected) {
    return <NoConnectionView />
  }

  // then, we check for location
  // if the user doesnt have a location, then we just 
  // if(!location) {

  // }

  if (!selectedLocation) {
    return (
      <LocationSelectionScreen />
    )
  }

  // if the store is closed and they havent continued anyways
  if (!selectedLocation.isOpen && !userContinueAnyways) {
    return <ClosedView continueExploring={() => setUserContinueAnyways(true)} />
  }

  // at this point either we are not closed, or they continued anyways. 
  return (
    <AuthContext>
      <WishlistContext>
        <CartContext>
          <NavigationContext>
            <MainNavigator />
            <StatusBar style={colorScheme == 'light' ? 'light' : 'light'} />
          </NavigationContext>
        </CartContext>
      </WishlistContext>
    </AuthContext>
  )
}

const LoadingView = () => {
  const phrases = [
    'Getting your snacks ready...',
    'Digging for gold...',
    'Charging  scooters...',
    'Go Dawgs...',
    'Taking a pit stop...',
    'Fueling up...',
    'Fasten your seatbelts...',
    'Snack attack incoming...',
    'Revving up our engines...',
    'Activating turbo mode...',
    'Dodging cars...',
    'Stuck in traffic...',
    'Some animals will follow you if you have wheat in your hand',
    "They're coming...",
    'Finding the North Star...',
    'Dance party!',
    'Bag chasing...',
    'What do you call a',
    'Logging into Michael Penix Jr. Fan Account...',
    'Why did the scooter cross the road?',
    "They don't know me son",
    "Good luck in school",
    "I always thought that Joose was pronounced like José",
    "Taking names...",
    "Testing air-balloons...",
    "Setting alarms...",
    "You deserve it",
    "Sade = the GOAT",
    "In the lab...",
    "Stuffing bags...",
    "Maybe dreams do come true",
    "Delivering happiness...",

  ];
  const randomIndex = Math.floor(Math.random() * phrases.length)
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size={'large'} color={theme.colors.primary} style={{ marginBottom: 12 }} />
      {/* <Text style={{ color: config.primaryColor, fontSize: 16 }}>{phrases[randomIndex]}</Text> */}
    </View>
  )
}


const NoConnectionView = () => (
  <View style={styles.container}>
    {/* <Image source={noNetworkCloud} style={styles.image} /> */}
    <Text style={styles.title}>Oops!</Text>
    <Text style={styles.text}>No internet connection found. Check your connection and try again.</Text>
  </View>
)

const ClosedView = ({ continueExploring }) => {
  const { selectedLocation } = useLocations();
  const [storeHours, setStoreHours] = useState<string>('');
  useEffect(() => {
    setStoreHours(selectedLocation.storeHours)
  }, [selectedLocation])

  return (
    <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', marginTop: 100, marginBottom: 250 }}>
      {/* logo */}
      <View style={{ width: 250, height: 50 }}>
        <Image source={logo} style={{ width: '100%', height: '100%', resizeMode: 'contain', }} />
      </View>


      {/* LOGO GOES HERE PER LOCATION */}
      {/* USE SIMILAR LOGIC FOR CHECKOUT, and for addressing in search/places input etc */}
      <View>
        <Text>
          {stores[selectedLocation?.name]?.name} is closed
          {/* can put the image and stuff in here too */}
          {/* {locations[selectedLocation?.name]?.name} */}
        </Text>
      </View>
      {/* text */}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 36, fontWeight: '700', marginBottom: 12 }}>
          We're Closed
        </Text>
        <Text style={{ fontSize: 24, fontWeight: '500' }}>
          See you next time!
        </Text>
      </View>


      {/* hours */}
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
    </View >
  )
}





const LocationSelectionScreen = () => {
  const { locations, selectLocation } = useLocations();

  const handleSelectLocation = (location) => {
    selectLocation(location);
  };


  return (
    <View style={{ display: 'flex', width: '100%', height: '100%', marginTop: 40 }}>
      <View style={{ width: 100, height: 100, alignSelf: 'center', marginTop: 0 }}>
        <Image source={logo} style={{ width: '100%', height: '100%', resizeMode: 'contain', }} />
      </View>

      {/* could just just put this in the list header component
      <View>
        <Text style={{ marginTop: 0, alignSelf: 'center', fontSize: 24, marginBottom: 20, fontWeight: '500' }}>Select your Location!</Text>
        <View style={{ height: 1, backgroundColor: 'gray', width: '90%', alignSelf: 'center' }} />
      </View> */}


      <FlatList
        data={locations}
        // can make the header component a skeleton loader when there are no items in the list (loading state)
        ListHeaderComponent={locations.length !== 0 ?
          <View>
            <Text style={{ marginTop: 0, alignSelf: 'center', fontSize: 24, marginBottom: 20, fontWeight: '500' }}>Select Your Location!</Text>
            <View style={{ height: 1, backgroundColor: 'gray', width: '90%', alignSelf: 'center' }} />
          </View>
          : <View style={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }} >
            {/* put the skeleton loader here */}
            <ActivityIndicator size='large' />
            <Text>Loading locations...</Text>
          </View>}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {

          const name = item.name;
          if (
            // name !== 'Testing_Scaling' && 
            name !== 'UW Store'
          ) {
            return (<></>)
          }
          return (
            <TouchableOpacity onPress={() => handleSelectLocation(item)}
              style={{ width: '90%', height: 75, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: 'gray', marginLeft: '5%' }}>
              <View style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', }}>
                <View style={{ width: 70, height: 50, marginRight: 16, marginLeft: 10 }} >
                  <Image source={stores[name].logo_path} style={{ width: 70, height: 50 }} resizeMode="cover" />


                  {/* this is where the image logo will go. Right now is just filler */}
                </View >
                <Text style={{ fontSize: 28, fontWeight: '600', marginBottom: -2, color: stores[name].logo_color }}>{stores[name].name}</Text>
              </View>
            </TouchableOpacity>
          )
        }
        }
      />
    </View>
  );
};


const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: theme.colors.background,
  },
  text: {
    letterSpacing: 1,
    color: theme.colors.text,
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    letterSpacing: 2,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 48,
  },
  image: {
    width: 120,
    height: 120 * 0.974,
  },
})