import { GestureHandlerRootView } from 'react-native-gesture-handler'
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
import { checkIfPasswordProtected } from './src/utils/checkIfPasswordProtected'
import { StoreClosedProvider, useStoreClosed } from './src/context/StoreClosedContext'


export default function App() {
  // rendering just the start, to limit the amount of renders on main app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreClosedProvider>
        <MainApp />
      </StoreClosedProvider>
    </GestureHandlerRootView>
  )
}

function MainApp() {
  const [isConnected, setIsConnected] = useState(true)
  const [isClosed, setIsClosed] = useState<Boolean>(false)
  const [isLoading, setIsLoading] = useState<Boolean>(false)
  const { userContinueAnyways, setUserContinueAnyways } = useStoreClosed();


  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // if (state.isConnected) {
      setIsConnected(state.isConnected ?? false)
      // }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const check = async () => {
      setIsLoading(true);
      try {
        const passwordEnabled = await checkIfPasswordProtected();
        setIsClosed(passwordEnabled)
        // if the store is open, then the user didnt continue anywas
        if (!passwordEnabled) {
          setUserContinueAnyways(false)
        }
      } catch (e) {
        console.log('failed to fetch store status')
      } finally {
        setIsLoading(false);
      }
    }
    setIsLoading(false);
    check();
  }, [])

  if (isLoading) {
    return <LoadingView />
  }

  if (!isConnected) {
    return <NoConnectionView />
  }

  if (isClosed && !userContinueAnyways) {
    return <ClosedView continueExploring={() => setUserContinueAnyways(true)} />
  }
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

const LoadingView = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size={'large'} color={theme.colors.primary} />
  </View>
)

const NoConnectionView = () => (
  <View style={styles.container}>
    {/* <Image source={noNetworkCloud} style={styles.image} /> */}
    <Text style={styles.title}>Oops!</Text>
    <Text style={styles.text}>No internet connection found. Check your connection and try again.</Text>
  </View>
)

const ClosedView = ({ continueExploring }) => (
  <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', marginTop: 100, marginBottom: 250 }}>
    {/* logo */}
    <View style={{ width: 250, height: 50 }}>
      <Image source={logo} style={{ width: '100%', height: '100%', resizeMode: 'contain', }} />
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
      height: 130,
      width: '80%',
      marginBottom: 24,
      // borderWidth: 1,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      shadowColor: 'black', shadowRadius: 1,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6
    }}>
      <View style={{ display: 'flex', marginLeft: 12, marginTop: 10, }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#4B2D83' }}>
          Store Hours
        </Text>
        <View style={{ marginLeft: 8, marginTop: 16, flex: 1, flexDirection: 'column', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '300' }}>Sunday - Thursday: 11AM - 12AM</Text>
          <View style={{ width: 250, height: 1, borderRadius: 2, backgroundColor: '#3C3C4333' }}></View>
          <Text style={{ fontSize: 18, fontWeight: '300', }}>Friday - Saturday: 11AM - 1AM</Text>
        </View>



      </View>

      <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
        <TouchableOpacity onPress={() => continueExploring()} style={{ backgroundColor: config.primaryColor, width: '80%', height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 30, paddingVertical: 12 }} >
          <Text style={{ fontSize: 18, color: 'white', fontWeight: '600' }} >
            Continue Exploring
          </Text>
        </TouchableOpacity>
      </View>


    </View>
  </View >
)
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