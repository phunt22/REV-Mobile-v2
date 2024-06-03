import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNavigationContext } from '../context/NavigationContext';
import { LoginStackParamList } from '../types/navigation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BackArrow, BackArrowIcon, EyeIcon, EyeOffIcon, RightArrowIcon, WhiteLogo } from '../components/shared/Icons';
import { config } from '../../config';
import { theme } from '../constants/theme';
import { useAuthContext } from '../context/AuthContext';
import { adminApiClient } from '../utils/checkIfPasswordProtected';
import * as WebBrowser from 'expo-web-browser'


type Props = NativeStackScreenProps<LoginStackParamList, 'OnboardingEmail'>

const getUserFromPhone = async (phoneNum) => {
    try {
        const cleanedNumber = phoneNum.replace(/\D/g, '')
        // clean the phone number
        // replace all non-numbers with nothing. Now we have a string of just numbers
        let formattedNumber = '';

        // if length (0,3] => (XXX)
        if (cleanedNumber.length > 0) {
            formattedNumber = `(${cleanedNumber.slice(0, 3)}`
        }
        if (cleanedNumber.length >= 4) {
            formattedNumber += `) ${cleanedNumber.slice(3, 6)}`;
        }
        if (cleanedNumber.length >= 7) {
            formattedNumber += `-${cleanedNumber.slice(6, 10)}`;
        }
        const query = `{
            customers(query: "phone:+1${cleanedNumber}", first: 2) {
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

        // console.log('get phone query')

        if (response?.data?.customers?.edges[0]?.node?.phone === `+1${cleanedNumber}`) {
            return response.data.customers.edges[0].node
        } else if (response?.data?.customers?.edges[1]?.node?.phone === `+1${cleanedNumber}`) {
            return response.data.customers.edges[1].node
        } else {
            return undefined
        }


        // return response.data.customers.edges[0].node
    } catch (e) {
        // console.log('getuserfromphone', e)
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
        // query can return incorrect information
        if (response.data.customers.edges[0].node.email === email) {
            return response.data.customers.edges[0].node
        } else {
            return undefined
        }
        // return response.data.customers.edges[0].node // this is the user's email!
    } catch (e) {
        // console.log('getuszerfromemail', e)
    }
}

const OnboardingEmail = ({ navigation, route }: Props) => {
    const { signUp } = useAuthContext()
    const { firstName, lastName, phoneNumber } = route.params;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { rootNavigation } = useNavigationContext()
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>()
    const scrollRef = useRef<ScrollView>()
    const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true)

    // takes in the id and newPhone of a user, will return the id of the udpated user (should be the same)
    const updateCustomerPhone = async (id, newPhone) => {
        try {
            const query = `mutation updateCustomerPhone($id: ID!, $newPhone: String!) {
                customerUpdate(input: {id: $id, phone: $newPhone}) {
                  customer {
                    id
                    email
                    phone
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`
            const variables = { id: id, newPhone: newPhone }
            const response: any = await adminApiClient(query, variables)
            return response.data?.customerUpdate?.customer?.id // return the id of the customer
            // returns the new updated user object
        } catch (e) {
            // console.log('updatecustomerphone', e)
            setErrorMessage('Something went wrong. Try again later')
        }
    }

    // takes in the id and newEmail of a user, will return the id of the updated user (should be the same)
    const updateCustomerEmail = async (id, newEmail) => {
        try {
            const query = `mutation updateCustomerEmail($id: ID!, $newEmail: String!) {
                customerUpdate(input: {id: $id, email: $newEmail}) {
                  customer {
                    id
                    email
                    phone
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`
            const variables = { id: id, newEmail: newEmail }
            const response: any = await adminApiClient(query, variables)
            return response.data.customerUpdate?.customer?.id // return the id of the customer
            // returns the new updated user object
        } catch (e) {
            // console.log('updatecustomeremail', e)
            setErrorMessage('Something went wrong. Try again later')
        }
    }

    // takes an id, returns the activation state of the customer
    // ENABLED means that they are ENABLED. Anything else, let's send them to that URL
    const getActivationStatus = async (id) => {
        try {
            const query = `query getCustomerActivationStatus($id: ID!) {
                customer(id: $id) {
                  id
                  email
                  state # This field indicates the customer's account status
                }
              }`
            const variables = { id: id }
            const response: any = await adminApiClient(query, variables)

            return response.data.customer?.state // returns the activation state of the customer
        } catch (e) {
            return 'ERROR'
            // Alert.alert('You already have an account!', 'Please reset your password and log in', [
            //     {
            //         text: 'Reset Password',
            //         onPress: () => {
            //             navigation.navigate('Login')// navigate to login
            //             navigation.push('ForgotPassword') // prompt to reset password
            //         }
            //     },
            //     {
            //         text: 'Cancel',
            //         style: 'cancel'
            //     },
            // ])
        }
    }

    // creates and returns a URL to activate the user's account
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
            setErrorMessage('Something went wrong. Try again later')
        }
    }

    const handleActivateAccount = async (id) => {
        const activationURL = await generateActivationURL(id)
        try {
            await WebBrowser.openBrowserAsync(activationURL)
            navigation.push('AccountActivated')
        } catch (e) {
            // console.log(e)
            setErrorMessage('Something went wrong. Try again later')
            // just bring them to forgot password. Good fail safe and should work I think
            // Alert.alert('You already have an account!', 'Please reset your password and log in', [
            //     {
            //         text: 'Reset Password',
            //         onPress: () => {
            //             navigation.navigate('Login')// navigate to login
            //             navigation.push('ForgotPassword') // prompt to reset password
            //         }
            //     },
            //     {
            //         text: 'Cancel',
            //         style: 'cancel'
            //     },
            // ])
        }
    }

    const mergeAccounts = async (phoneUser, emailUser) => {
        try {
            const query = `
        mutation CustomerMerge($customerOneId: ID!, $customerTwoId: ID!) {
            customerMerge(customerOneId: $customerOneId, customerTwoId: $customerTwoId) {
                resultingCustomerId
                job {
                    id
                    done
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;
            const variables = {
                customerOneId: phoneUser.id, // Make sure these are in the correct ID format
                customerTwoId: emailUser.id
            };
            const response: any = await adminApiClient(query, variables)
            if (response.errors && response.errors.length !== 0) {
                throw new Error(response.errors.map(e => e.message).join(', '));
            }
            const mergedCustomerID = response.data.customerMerge.resultingCustomerId;
            return mergedCustomerID;
        } catch (e) {
            setErrorMessage('failed to merge accounts')
        }


    }



    const handleNext = async () => {
        setLoading(true)
        setErrorMessage(null)

        if (!email || !password) {
            setErrorMessage('Please enter your email and password')
            setLoading(false)
            return
        } else if (password.length < 5) {
            setErrorMessage('Password must be at least 5 characters!')
        }
        try {
            const userEmail = await getUserFromEmail(email); // user associated with their email
            const userPhone = await getUserFromPhone(phoneNumber); // user associated with their phone number
            // might have to check that the queries are equal to the desired attributes

            // if they dont have either, then sign them up as normal
            if (!userEmail && !userPhone) {
                await signUp(firstName, lastName, email, phoneNumber, password, true)
                // then we are in
            }

            // no userPhone, yes userEmail
            // what this does: 
            // add the phone to the email, we know it isnt associated with an account
            // check account activation status
            // if activated:
            // redirect them to login
            // else
            // redirect them to activation
            if (!userPhone && userEmail) {
                const userID = await updateCustomerPhone(userEmail.id, phoneNumber)
                // console.log('userID', userID)
                const isActivated = await getActivationStatus(userID)
                if (isActivated === 'ENABLED') {
                    Alert.alert('You already have an account!', 'Please reset your password and log in', [
                        {
                            text: 'Reset Password',
                            onPress: () => {
                                navigation.navigate('Login')// navigate to login
                                navigation.push('ForgotPassword') // prompt to reset password
                            }
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        },
                    ])
                } else if (isActivated === 'ERROR') {
                    // try forgot password
                    Alert.alert('You already have an account!', 'Please reset your password and log in', [
                        {
                            text: 'Reset Password',
                            onPress: () => {
                                navigation.navigate('Login')// navigate to login
                                navigation.push('ForgotPassword') // prompt to reset password
                            }
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        },
                    ])
                } { // account is not activated yet
                    Alert.alert('You already have an account!', 'Activate your account with this link to get started!', [{
                        text: 'Activate',
                        onPress: () => handleActivateAccount(userID),
                    }, {
                        text: 'Cancel',
                        style: 'cancel'
                    }])
                }
                // setErrorMessage('You have an account! Log in with this email')
                // return;
            }

            // yes userPhone, no userEmail
            // use the same exact format, but instead we are going to just do the inverse
            if (userPhone && !userEmail) {
                const userID = await updateCustomerEmail(userPhone.id, email)
                if (userID.email && userID.phone) {
                    setErrorMessage(`That email is taken by ${userID.phone}`)
                    return
                }
                const isActivated = await getActivationStatus(userID)

                // this is the exact same
                if (isActivated === 'ENABLED') {

                    Alert.alert('You already have an account!', 'Please reset your password and log in', [
                        {
                            text: 'Reset Password',
                            onPress: () => {
                                navigation.navigate('Login')// navigate to login
                                navigation.push('ForgotPassword') // prompt to reset password
                            }
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        },
                    ])
                } else { // account is not activated yet
                    Alert.alert('You already have an account!', 'Activate your account with this link to get started!', [{
                        text: 'Activate',
                        onPress: () => handleActivateAccount(userID),
                    }, {
                        text: 'cancel',
                        style: 'cancel'
                    }])
                }

                // I believe that this wouldnt work, but this is what we were doing before
                // await signUp(firstName, lastName, email, phoneNumber, password, true)
            }



            // if both (should never happen with check on phone number now)
            // then just set an error message and return
            if (userEmail && userPhone) {
                // they are separate accounts that have both a phone and an email
                // so, we merge the accounts
                const mergedID = await mergeAccounts(userEmail, userPhone)
                const isActivated = await getActivationStatus(mergedID)

                // this is the exact same
                if (isActivated === 'ENABLED') {
                    Alert.alert('You already have an account!', 'Please reset your password and log in', [
                        {
                            text: 'Reset Password',
                            onPress: () => {
                                navigation.navigate('Login')// navigate to login
                                navigation.push('ForgotPassword') // prompt to reset password
                            }
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        },
                    ])
                } else if (isActivated === 'ERROR') {
                    Alert.alert('You already have an account!', 'Please reset your password and log in', [
                        {
                            text: 'Reset Password',
                            onPress: () => {
                                navigation.navigate('Login')// navigate to login
                                navigation.push('ForgotPassword') // prompt to reset password
                            }
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        },
                    ])
                }
                else { // account is not activated yet

                    Alert.alert('You already have an account!', 'Activate your account with this link to get started!', [{
                        text: 'Activate',
                        onPress: () => handleActivateAccount(mergedID),
                    }, {
                        text: 'cancel',
                        style: 'cancel'
                    }])
                }
            }

            // this is where users are signed up
            // await signUp(firstName, lastName, email, phoneNumber, password, true)
            // rootNavigation.goBack()
        } catch (error: any) {
            // error.code === 'CUSTOMER_DISABLED' && navigation.push('VerifyEmail', { message: error.message })
            typeof error.message === 'string' && setErrorMessage(error.message)
        }
        setLoading(false)
    };

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
    }, [])

    const toggle = () => {
        setSecureTextEntry(!secureTextEntry);
    }


    return (
        <KeyboardAvoidingView
            behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            style={{ flex: 1, }}

        >
            <ScrollView
                scrollEnabled={Platform.OS == 'ios' ? false : true}
                showsVerticalScrollIndicator={false}
                ref={scrollRef}
                contentContainerStyle={{
                    justifyContent: 'space-between',
                    flex: 1,
                    // backgroundColor: 'yellow', height: '100%', display: 'flex'
                }}
                // style={{ backgroundColor: 'green', height: '100%', }}
                keyboardShouldPersistTaps='always'
            >


                {/* flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 6,
        backgroundColor: 'pink',
        paddingBottom: 250,
        height: '100%', */}
                {/* <View style={{ display: 'flex', height: '100%' }}> */}



                <View style={{
                    // backgroundColor: 'pink', 
                    height: '100%', flex: 1
                }}
                // style={styles.container} 
                >

                    {/* top section */}
                    <View style={{
                        // backgroundColor: 'pink', 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        // height: 150
                    }} >
                        {/* little top bar things */}
                        <View style={{ width: '90%', height: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', marginTop: 10 }}>
                            <View style={{ backgroundColor: '#4B2D83', width: 106, height: 8, borderRadius: 12 }}></View>
                            <View style={{ backgroundColor: '#4B2D83', width: 106, height: 8, borderRadius: 12 }}></View>
                            <View style={{ backgroundColor: '#4B2D83', width: 106, height: 8, borderRadius: 12 }}></View>
                        </View>

                        {/* title */}
                        <View style={{
                            width: '75%',
                            marginBottom: 0,
                            paddingTop: 30,
                            //  backgroundColor: 'yellow'
                        }}>
                            <Text style={{ fontWeight: '900', color: '#4B2D83', fontSize: 38, fontStyle: 'italic' }}>
                                Sign up with email
                            </Text>
                        </View>
                    </View>


                    {/* bottom section */}
                    <View style={{
                        // backgroundColor: 'green', 
                        flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <View style={{

                            width: '75%'
                        }}>
                            {errorMessage ?
                                (<View style={{ top: 0, justifyContent: 'flex-end', marginBottom: 10, alignItems: 'center' }}>
                                    <Text style={{ color: 'red' }}>{errorMessage}</Text>
                                </View>) : (<View style={{ marginBottom: 30, width: '100%', backgroundColor: 'red' }}></View>)
                            }
                            {/* Input container */}
                            <View style={{ width: '100%', alignItems: 'flex-start', }}>
                                <Text style={styles.inputSubTitle}>
                                    Email
                                </Text>
                                <TextInput
                                    // placeholder="First Name"
                                    placeholderTextColor={theme.colors.disabledText}
                                    onChangeText={setEmail}
                                    value={email}
                                    style={email ? (styles.input) : (styles.inputEmpty)}
                                    autoCorrect={false}
                                    autoCapitalize='none'
                                />
                                <Text style={styles.inputSubTitle}>
                                    Password
                                </Text>
                                <TextInput
                                    // placeholder="Last Name"
                                    placeholderTextColor={theme.colors.disabledText}
                                    onChangeText={setPassword}
                                    value={password}
                                    style={password ? (styles.input) : (styles.inputEmpty)}
                                    secureTextEntry={secureTextEntry}
                                    autoCorrect={false}
                                    numberOfLines={1}
                                />
                                {/* the touchable to toggle pw sight */}
                                <TouchableOpacity onPress={toggle}
                                    style={{ width: 40, height: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'absolute', right: 4, bottom: errorMessage ? (23) : (23), }}>
                                    {secureTextEntry ? (<EyeOffIcon size={30} color={'black'} />) : (<EyeIcon size={30} color={'black'} />)}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{
                            width: '90%', display: 'flex', justifyContent: 'flex-end', flexDirection: 'row',
                            // position: 'absolute',
                            // bottom: 0
                            marginBottom: 40,

                        }}>

                            {loading ?
                                <View style={styles.nextCircleEmpty}><ActivityIndicator /></View> :
                                <TouchableOpacity
                                    style={email && password ? (styles.nextCircle) : (styles.nextCircleEmpty)}
                                    // style={styles.loginContainer}
                                    onPress={handleNext}>
                                    {/* <Text style={styles.loginText}>Next</Text> */}
                                    <RightArrowIcon color='#FFFFFF' size={30} />
                                    <View style={{ marginTop: 10 }}></View>
                                </TouchableOpacity>
                            }
                        </View>
                    </View>





                </View>
            </ScrollView>
            {/* </View> */}
        </KeyboardAvoidingView >
    );
};

export default OnboardingEmail;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 6,
        // backgroundColor: 'pink',
    },
    image: {
        width: config.logoWidth,
        height: config.logoWidth * config.logoSizeRatio,
        // marginBottom: 48,
    },
    input: {
        // marginTop: 15,
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
        marginBottom: 6,
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
        marginBottom: 6,
    },
    loginContainer: {
        paddingVertical: 6,
        paddingHorizontal: 20,
        width: '60%',
        backgroundColor: '#4B2D83',
        alignItems: 'center',
        borderRadius: 10,
        // marginTop: '10%'
    },
    loginText: {
        color: theme.colors.background,
        fontSize: 18,
        letterSpacing: 1,
        fontWeight: '500'
    },
    headerText: {
        color: '#4B2D83',
        fontSize: 40,
        fontWeight: '900',
        // marginBottom: 24
    },
    descText: {
        color: '#3C3C43',
        fontSize: 16,
        fontWeight: '500',
        // marginBottom: 24
    },
    inputSubTitle: {
        color: '#4B2D83',
        fontSize: 14,
        marginLeft: 6,
        marginBottom: 4
    },
    nextCircle: {
        width: 60,
        height: 60,
        borderRadius: 60,
        backgroundColor: '#4B2D83',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    nextCircleEmpty: {
        // position: 'absolute',
        // bottom: 15,
        width: 60,
        height: 60,
        borderRadius: 60,
        backgroundColor: '#D9D9D9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }
}
)