import { useEffect, useRef, useState } from "react";
import { View, TextInput, StyleSheet } from 'react-native';
import { ScrollView } from "react-native-gesture-handler";


interface PriceInputProps {
    onCustomTipChange: (customTipAmount: string) => void;
}

const PriceInput: React.FC<PriceInputProps> = ({ onCustomTipChange }) => {
    const [customTipAmount, setCustomTipAmount] = useState('');
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);


    const handleCustomTipChange = (input: string) => {
        // Remove non-numeric characters except for the decimal point
        let sanitizedInput = input.replace(/[^0-9.]/g, '');

        // Ensure the input does not start with a negative sign
        if (sanitizedInput.startsWith('-')) {
            sanitizedInput = sanitizedInput.substring(1);
        }

        // Ensure only one decimal point is allowed
        const parts = sanitizedInput.split('.');
        if (parts.length > 2) {
            return;
        }

        // Ensure only up to two decimal places are allowed
        if (parts[1] && parts[1].length > 2) {
            parts[1] = parts[1].substring(0, 2);
            sanitizedInput = parts.join('.');
        }
        if (parseFloat(sanitizedInput) > 1000) {
            return;
        }

        if (parts[1] && parts[1].length === 2) {
            inputRef.current?.blur();
        }


        // Update the state with formatted custom tip amount
        setCustomTipAmount(sanitizedInput);
        onCustomTipChange(sanitizedInput); // Pass the custom tip amount up to the parent component
    };

    return (
        <View style={styles.container}>
            <ScrollView
                keyboardShouldPersistTaps="never"
                scrollEnabled={false}
            >
                <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    value={`$${customTipAmount}`}
                    keyboardType="numeric"
                    onChangeText={handleCustomTipChange}
                    selectionColor={'white'}
                    blurOnSubmit={true}
                    returnKeyType="done"

                />
            </ScrollView>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textInput: {
        color: 'white',
        fontSize: 14,
        padding: 10,
        borderRadius: 5,
    },
});

export default PriceInput;