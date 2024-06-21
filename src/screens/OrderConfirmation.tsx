import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { config } from '../../config'
import logo from '../../src/assets/logo.png'


function OrderConfirmation({ navigation }) {

    useEffect(() => {
        navigation.setOptions({
            headerLeft: () => (<></>),
            headerTitle: () => (<></>),
        })
    })
    return (
        <View style={{ width: '100%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            {/* <View style={{ width: 250, height: 50 }}>
                <Image source={logo} style={{ width: '100%', height: '100%', resizeMode: 'contain', }} />
            </View> */}
            <View style={{ height: '8%' }} />

            <View style={{ width: '100%', height: '92%', alignItems: 'center', justifyContent: 'space-between' }}>

                <View style={{ alignItems: 'flex-start' }}>
                    <Text style={{ color: config.primaryColor, fontSize: 90, fontWeight: '800', fontStyle: 'italic' }}>
                        Got it!
                    </Text>
                    <Text style={{ fontWeight: '600', marginBottom: 20 }}>
                        Be on the lookout for a text with delivery information
                    </Text>
                    <Text style={{ alignSelf: 'flex-start', fontWeight: '600' }}>
                        We'll see you in 10 😁
                    </Text>
                </View>

                <TouchableOpacity style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    width: '90%', backgroundColor: config.primaryColor, height: 50, borderRadius: 50
                }}
                    onPress={() => navigation.navigate('TabNavigator')}
                >
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: '600', letterSpacing: 0.2 }}>Return home</Text>
                </TouchableOpacity>
            </View>
        </View >
    )
}

export default OrderConfirmation