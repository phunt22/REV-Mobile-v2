import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Keyboard, Alert, } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNavigationContext } from '../context/NavigationContext';
import { LoginStackParamList } from '../types/navigation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BackArrow, BackArrowIcon, DownArrowIcon, EyeIcon, LockIcon, RightArrowIcon, WhiteLogo } from '../components/shared/Icons';
import { theme } from '../constants/theme';
import { config } from '../../config';
import { CountryPicker } from "react-native-country-codes-picker";
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { storefrontApiClient } from '../utils/storefrontApiClient';
import { adminApiClient } from '../utils/checkIfPasswordProtected';
import { encode } from 'base-64';


type Props = NativeStackScreenProps<LoginStackParamList, 'OnboardingPhone'>


// Method to send OTP



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
            customers(query: "phone:${cleanedNumber}", first: 2) {
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
        // return response.data.customers.edges[0].node
        if (response?.data?.customers?.edges[0]?.node?.phone === `+1${cleanedNumber}`) {
            return response.data.customers.edges[0].node
        } else if (response?.data?.customers?.edges[1]?.node?.phone === `+1${cleanedNumber}`) {
            return response.data.customers.edges[1].node
        } else {
            return undefined
        }

        // return response.data.cusomers.edges[0].node // this is the email user
    } catch (e) {

        // console.log('getUserFRomPhone', e)
    }
}


const OnboardingPhone = ({ navigation, route }: Props) => {
    const { firstName, lastName } = route.params;
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>()
    const scrollRef = useRef<ScrollView>()

    // FOR OTP PURPOSES
    const [codeSent, setCodeSent] = useState<boolean>(false)
    const [codeInput, setCodeInput] = useState('')

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

    const sendOTP = async (phoneNumber) => {
        const url = `https://verify.twilio.com/v2/Services/${config.SERVICE_ID}/Verifications`;

        const credentials = encode(`${config.ACCOUNT_SID}:${config.AUTH_TOKEN}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `To=%2B1${phoneNumber}&Channel=sms`
                // body: `To=`
            });

            if (response.ok) {
                const jsonResponse = await response.json();

            } else {
                const errorResponse = await response.text();
                throw new Error(`Failed to send OTP: ${errorResponse}`);
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            Alert.alert("Something went wrong", "Too many concurrent requests. Please wait a minute and try again later. ");
        }
    };

    const verifyOTP = async (phoneNumber, otp) => {
        const phoneInE164 = phoneNumber.startsWith('+1') ? phoneNumber : `+1${phoneNumber}`;
        const url = `https://verify.twilio.com/v2/Services/${config.SERVICE_ID}/VerificationCheck`;
        const credentials = encode(`${config.ACCOUNT_SID}:${config.AUTH_TOKEN}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `To=%2B1${phoneInE164}&Code=${otp}`,
            });

            if (response.ok) {
                const jsonResponse = await response.json();
                if (jsonResponse.status === 'approved') {
                    return true;
                } else {
                    Alert.alert('Error', 'OTP verification failed. Please try again.');
                    return false;
                }
            } else {
                const errorResponse = await response.text();
                throw new Error(`Failed to verify OTP: ${errorResponse}`);
            }
        } catch (error) {
            Alert.alert('Error', `Failed to Verify OTP`);
            return false;
        }
    };

    // this is a temp function with twilio disabled
    const handleNext = async () => {
        if (!codeSent) {
            setLoading(true);
            const emailUser = await getUserFromPhone(phoneNumber)
            if (emailUser && emailUser.email) { // this means that they have a "full" account
                setErrorMessage(`You have an account! Log in with ${emailUser?.email}`)
                setLoading(false)
                return
            } else {
                // SEND THE CODE!
                // console.log(phoneNumber.replace(/\D/g, ''))
                sendOTP(phoneNumber.replace(/\D/g, ''))
                setCodeSent(true)
                // if otp is valid, then navigate to the next
            }
            setErrorMessage(null)
            setLoading(false)

            // if (!phoneNumber) {
            //     setErrorMessage('Please enter your phone number')
            //     return
            // } else if (phoneNumber.length < 9) {
            //     setErrorMessage('Please enter a valid phone number')
            //     return
            // } else {
            //     sendOTP(phoneNumber.replace(/\D/g, '')) // for testing purposes
            //     setCodeSent(true)
            //     setLoading(false)
            // }

        } else { // if the code has been sent already
            setLoading(true)
            const success = await verifyOTP(phoneNumber, codeInput)
            setLoading(false)
            if (success) {
                setLoading(false)
                navigation.navigate('OnboardingName', { phoneNumber });
            } else {
                setErrorMessage('Wrong code. Try again later')
            }
        }
    }



    // formats the phone number to be in the format of (XXX)XXX-XXXX
    const handlePhoneNumberChange = (value) => {
        const cleanedNumber = value.replace(/\D/g, '')
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
        // console.log(phoneToE164(cleanedNumber))
        setPhoneNumber(formattedNumber)
    }



    const phoneToE164 = (number) => {
        return `+1${number}`
    }

    return (

        <KeyboardAvoidingView
            behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 128 : 0}
            style={{ flex: 1, }}
        >
            <TouchableWithoutFeedback style={{ height: '100%' }} onPress={Keyboard.dismiss}>
                <ScrollView
                    scrollEnabled={Platform.OS == 'ios' ? false : true}
                    showsVerticalScrollIndicator={false}
                    ref={scrollRef}
                    contentContainerStyle={{
                        justifyContent: 'space-between', flex: 1, alignItems: 'center',
                    }}
                    // style={{ display: 'flex', height: '100%', backgroundColor: 'yellow', }}
                    keyboardShouldPersistTaps='always'
                >

                    {/* <View style={{
                    display: 'flex', height: '100%', padding: 0, backgroundColor: 'green'
                    // backgroundColor: 'yellow' 
                }}> */}

                    <View style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: 150,
                    }} >
                        {/* little top bar things */}
                        <View style={{ width: '90%', height: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', marginTop: 10 }}>
                            <View style={{ backgroundColor: '#4B2D83', width: 106, height: 8, borderRadius: 12 }}></View>
                            <View style={{ backgroundColor: '#D9D9D9', width: 106, height: 8, borderRadius: 12 }}></View>
                            <View style={{ backgroundColor: '#D9D9D9', width: 106, height: 8, borderRadius: 12 }}></View>
                        </View>

                        {/* title */}
                        <View style={{ width: '90%', marginBottom: 15, marginLeft: 36 }}>
                            <Text style={{ fontWeight: '900', color: '#4B2D83', fontSize: 38, fontStyle: 'italic', }}>
                                What's your number?
                            </Text>
                        </View>
                    </View>

                    <View style={{

                        flex: 1, justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <View style={{ alignItems: 'center' }}>
                            {errorMessage ?
                                (<View style={{ height: 20, justifyContent: 'flex-end', marginBottom: 20, alignItems: 'center' }}>
                                    <Text style={{ color: 'red' }}>{errorMessage}</Text>
                                </View>) : (<View style={{ height: 40, width: '100%' }}></View>)
                            }
                            <View style={{
                                width: '75%', flexDirection: 'row', display: 'flex', justifyContent: 'space-between',

                            }} >
                                {/* country container */}
                                <View >
                                    <Text style={styles.inputSubTitle}>
                                        Country
                                    </Text>
                                    <View style={{ backgroundColor: '#D9D9D9', height: 35, width: 75, flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 }}>
                                        <Text>
                                            US +1
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ width: '70%' }}>
                                    <Text style={styles.inputSubTitle}>
                                        Phone number
                                    </Text>
                                    <TextInput
                                        // placeholder="Phone Number"
                                        placeholderTextColor={theme.colors.disabledText}
                                        style={phoneNumber ? (styles.input) : (styles.inputEmpty)}
                                        autoComplete='tel'
                                        onChangeText={handlePhoneNumberChange}
                                        value={phoneNumber}
                                        keyboardType="phone-pad"
                                        placeholder='(555) 555-5555'
                                    />
                                </View>
                            </View>
                            {codeSent ? (
                                // {true ? (
                                <View style={{
                                    width: '75%', flexDirection: 'row', display: 'flex', justifyContent: 'space-between', marginTop: 12
                                }} >
                                    {/* country container */}
                                    <View >
                                        <View style={{ width: 75, height: 35 }} />

                                    </View>
                                    <View style={{ width: '70%' }}>
                                        <Text style={styles.inputSubTitle}>Verification Code</Text>
                                        <TextInput
                                            style={{
                                                // marginTop: 15,
                                                fontSize: 14,
                                                width: 100,
                                                borderRadius: 8,
                                                height: 38,
                                                backgroundColor: '#D9D9D9',
                                                // padding: 10,
                                                paddingLeft: 16,
                                                paddingHorizontal: 4,
                                                color: theme.colors.text,
                                                borderWidth: 1,
                                                borderBottomWidth: 3,
                                                borderColor: '#4B2D83',
                                            }}
                                            onChangeText={setCodeInput}
                                            value={codeInput}
                                            keyboardType="number-pad"
                                            placeholder="123456"
                                            autoComplete='sms-otp'
                                            onSubmitEditing={handleNext}
                                            textContentType="oneTimeCode"
                                            accessibilityLabel="Verification Code"
                                            accessibilityHint="Enter the code sent to your phone"
                                        />
                                    </View>
                                </View>




                            ) : null}

                        </View>
                    </View>





                    {/* </View> */}
                    <View style={{
                        // backgroundColor: 'orange',
                        // position: 'absolute',
                        // bottom: Platform.OS === 'ios' ? 30 : 20,
                        // right: 20,
                        width: '90%',
                        // display: 'flex',
                        // justifyContent: 'space-between',
                        // flexDirection: 'row',
                        // marginBottom: 30,
                        // backgroundColor: 'orange',
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexDirection: 'row',
                        // position: 'absolute',
                        bottom: 30,
                        // right: 10,
                        // left: 10,

                        // marginTop: 60
                        height: 30,
                        alignItems: 'center'
                    }}>
                        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '70%', }}>
                            {/* eye icon */}
                            <LockIcon size={30} color='black' />
                            <Text style={{ color: 'black', fontSize: 14, marginTop: 4, marginLeft: 4 }}>We never share this with anyone.</Text>

                        </View>
                        {loading ?
                            <View style={styles.nextCircleEmpty}><ActivityIndicator /></View>
                            :
                            <TouchableOpacity
                                style={phoneNumber.length > 13 && !codeSent || codeSent && codeInput.length > 5 ? (styles.nextCircle) : (styles.nextCircleEmpty)}
                                disabled={phoneNumber.length <= 12}
                                // style={styles.loginContainer}
                                onPress={() => handleNext()}>
                                {/* <Text style={styles.loginText}>Next</Text> */}
                                <RightArrowIcon color='#FFFFFF' size={30} />
                                <View style={{ marginTop: 10 }}></View>
                            </TouchableOpacity>
                        }
                    </View>
                    {/* </TouchableWithoutFeedback> */}

                </ScrollView>
            </TouchableWithoutFeedback >
        </KeyboardAvoidingView >
    )
}

export default OnboardingPhone;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 6,
        // backgroundColor: 'pink',
        // paddingBottom: 250
    },
    image: {
        width: config.logoWidth,
        height: config.logoWidth * config.logoSizeRatio,
        marginBottom: 48,
    },
    input: {
        // marginTop: 15,
        fontSize: 14,
        width: '100%',
        borderRadius: 8,
        height: 38,
        backgroundColor: '#D9D9D9',
        // padding: 10,
        paddingLeft: 16,
        paddingHorizontal: 4,
        color: theme.colors.text,
        borderWidth: 1,
        borderBottomWidth: 3,
        borderColor: '#4B2D83',
    },
    inputEmpty: {
        fontSize: 14,
        width: '100%',
        borderRadius: 8,
        backgroundColor: '#D9D9D9',
        // padding: 10,
        height: 36,
        paddingLeft: 16,
        paddingHorizontal: 4,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: '#4B2D83',
    },
    loginContainer: {
        paddingVertical: 6,
        paddingHorizontal: 20,
        width: '60%',
        backgroundColor: '#4B2D83',
        alignItems: 'center',
        borderRadius: 10,
        marginTop: '10%'
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
        marginBottom: 24
    },
    descText: {
        color: '#3C3C43',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 24
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
        width: 60,
        height: 60,
        borderRadius: 60,
        backgroundColor: '#D9D9D9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    inputSubTitle: {
        color: '#4B2D83',
        fontSize: 14,
        marginLeft: 6,
        marginBottom: 4
    },
})