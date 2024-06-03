import { View, Text, ScrollView, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { useEffect, useState } from 'react'
import { theme } from '../constants/theme'
import { LoginStackParamList } from '../types/navigation'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { storefrontApiClient } from '../utils/storefrontApiClient'
import { BackArrow, WhiteLogo } from '../components/shared/Icons'
import { config } from '../../config'
import { adminApiClient } from '../utils/checkIfPasswordProtected'
import * as WebBrowser from 'expo-web-browser'


export type Props = NativeStackScreenProps<LoginStackParamList, 'ForgotPassword'>

const ForgotPassword = ({ navigation }: Props) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>()

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: -20 }}>
          <BackArrow
            color={'#4B2D83'}
            size={20}
          />
        </TouchableOpacity>
      ),
      headerTitle: () => (
        <WhiteLogo />
      )
    });
  })

  const generateActivationURL = async (customerID) => {
    try {
      const query = `mutation customerGenerateAccountActivationUrl($customerId: ID!) {
        customerGenerateAccountActivationUrl(customerId: $customerId) {
          accountActivationUrl
          userErrors {
            field
            message
          }
        }
      }`
      const variables = { customerId: customerID }
      const response: any = await adminApiClient(query, variables)
      if (response.errors && response.errors.length !== 0) {
        throw response.errors[0].message
      }
      return response.data.customerGenerateAccountActivationUrl.accountActivationUrl
    } catch (e) {
      e?.message && setErrorMessage(e.message)
    }
  }

  const getUserFromEmail = async (email) => {
    try {
      const query = `{
            customers(query: "email:${email}", first: 1) {
                edges {
                    node {
                        id
                        firstName
                        lastName
                        email
                        phone
                    }
                }
            }
        }`

      const response: any = await adminApiClient(query)

      if (response.errors && response.errors.length !== 0) {
        throw response.errors[0].message
      }
      return response.data.customers.edges[0].node ? (response.data.customers.edges[0].node) : undefined // users email if its present

    } catch (e) {
      // setErrorMessage(typeof e === 'string' && e)
      e?.message && setErrorMessage(e.message)
    }
  }


  const resetPasswordButton = async () => {
    // no need to proceed if email is empty
    if (!email.trim()) {
      return
    }
    setLoading(true)
    setErrorMessage(null)
    try {
      // just use the email from the useState
      const query = `mutation customerRecover($email: String!) {
        customerRecover(email: $email) {
          customerUserErrors {
            code
            field
            message
          }
        }
      }`

      const variables = { email: email }
      const response: any = await storefrontApiClient(query, variables)

      if (response.errors && response.errors.length != 0) {
        throw new Error(response.errors[0].message)
        // console.log('GraphQL errors', response.errors)
        // throw response.errors[0].message

      }
      if (response.data.customerRecover.customerUserErrors.length != 0) {
        throw new Error(response.data.customerRecover.customerUserErrors[0].message)
        // console.log(response.data.customerRecover.customerUserErrors)
        // throw response.data.customerRecover.customerUserErrors[0].message
      }
      // console.log('password reset link sent successfully')

      navigation.push('ForgotPasswordEmailSent')

    } catch (e) {
      try {
        const emailUser = await getUserFromEmail(email.trim().toLowerCase());
        if (emailUser) {
          const emailUserID = emailUser.id
          // console.log('email user id', emailUserID)
          const activationURL = await generateActivationURL(emailUserID);

          // OPEN IT IN A WEB LINK

          await WebBrowser.openBrowserAsync(activationURL)
          navigation.push('AccountActivated')
        } else {
          setErrorMessage('No account found with that email. Please create an account')
        }

      } catch (innerError) {
        // console.log('timed out with error', innerError)
        setErrorMessage('Failed to proceed. Please wait and try again')
      }
    } finally {
      setLoading(false)
    }
  }







  //   try {
  //     const emailUser = await getUserFromEmail(email.trim().toLowerCase());
  //     console.log('user found', emailUser)
  //     // const query = `mutation recoverCustomerAccount($email: String!) {
  //     //   customerRecover(email: $email) {
  //     //     customerUserErrors {
  //     //       code
  //     //       field
  //     //       message
  //     //     }
  //     //   }
  //     // }`

  //     // mutation to send the forgot password email
  //     const query = `mutation customerRecover($email: String!) {
  //       customerRecover(email: $email) {
  //         customerUserErrors {
  //           code
  //           field
  //           message
  //         }
  //       }
  //     }`

  //     const variables = { email: emailUser.email.toLowerCase() }
  //     console.log('Sending mutation with email', variables.email)

  //     const response: any = await storefrontApiClient(query, variables)
  //     // console.log(response.data.customerRecover.customerUserErrors)
  //     console.log('mutation response', response)

  //     if (response.errors && response.errors.length != 0) {
  //       console.log('GraphQL errors', response.errors)
  //       throw response.errors[0].message

  //     }

  //     if (response.data.customerRecover.customerUserErrors.length != 0) {
  //       console.log(response.data.customerRecover.customerUserErrors)
  //       throw response.data.customerRecover.customerUserErrors[0].message
  //     }
  //     console.log('password reset link sent successfully')
  //     navigation.push('ForgotPasswordEmailSent')
  //   } catch (error: any) {
  //     typeof error === 'string' && setErrorMessage(error)

  //   }

  //   setLoading(false)
  // }




  return (
    <KeyboardAvoidingView
      behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      style={{ flex: 1, height: '100%' }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '105%', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontWeight: '900', color: config.primaryColor, fontSize: 30, fontStyle: 'italic', marginBottom: 10, marginTop: 10 }}>
            Forgot your password?
          </Text>
          <Text style={{ fontWeight: '300', fontSize: 14, width: '75%' }}>
            All good! Just enter your email and check your inbox.
          </Text>
        </View>

        {errorMessage ? (
          <View style={{ height: 32, marginTop: 12 }}>
            <Text style={{ color: 'red', textAlign: 'center' }}>{errorMessage}</Text>
          </View>
        ) : (
          <View style={{ height: 32 }}>
            <Text style={{ color: theme.colors.background }}>peco</Text>
          </View>
        )}

        <View style={{ width: '75%', display: 'flex', alignItems: 'flex-start' }}>
          <Text style={styles.inputSubTitle}>Email</Text>
          <TextInput
            placeholder='rev@delivery.com'
            placeholderTextColor={theme.colors.disabledText}
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={setEmail}
            value={email}
            style={email ? styles.input : styles.inputEmpty}
          />


          <View style={{ height: '20%' }} />
        </View>


        <View style={{ flex: 1 }} />
      </ScrollView>

      <View style={{ width: '100%', alignItems: 'center', display: 'flex' }}>
        {loading ? (
          <View style={{
            backgroundColor: '#4B2D83',
            width: 300,
            height: 50,
            // paddingHorizontal: 140,
            // paddingVertical: 12,
            maxWidth: '100%',
            borderRadius: 30,
            marginBottom: 50,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
          }}>
            <ActivityIndicator />
          </View>

        ) : (
          <TouchableOpacity
            onPress={resetPasswordButton}
            style={{
              backgroundColor: '#4B2D83',
              width: 300,
              height: 50,
              // paddingHorizontal: 100,
              // paddingVertical: 12,
              maxWidth: '100%',
              borderRadius: 30,
              marginBottom: 50,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
            }}
          >
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
              Reset Password
            </Text>
          </TouchableOpacity>
        )}
      </View>

    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    height: '100%',
  },
  text: {
    color: theme.colors.text
  },
  input: {
    fontSize: 18,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#D9D9D9',
    padding: 10,
    paddingLeft: 16,
    paddingHorizontal: 4,
    color: theme.colors.text,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: '#4B2D83',
  },
  inputEmpty: {
    fontSize: 18,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#D9D9D9',
    padding: 10,
    paddingLeft: 16,
    paddingHorizontal: 4,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: '#4B2D83',
  },
  inputSubTitle: {
    color: '#4B2D83',
    fontSize: 14,
    marginLeft: 6,
    marginBottom: 4
  },
})

export default ForgotPassword