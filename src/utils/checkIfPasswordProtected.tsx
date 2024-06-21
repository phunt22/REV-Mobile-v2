import { config } from "../../config"
import axios from 'axios'

const shopName = 'gorev-8373';
const accessToken = config.shopifyAdminAccessToken;
const apiVersion = 'unstable'
const baseUrl = `https://${shopName}.myshopify.com/admin/api/${apiVersion}`;

export const checkIfPasswordProtected = async () => {
    // console.log('admin api client')
    // console.log(accessToken)
    try {
        const response = await axios.get(`${baseUrl}/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
            },
        });
        const shop = response.data.shop;
        // return shop.password_enabled;
        // return store.passwordProtection.enabled
        return shop.password_enabled;
    } catch (e) {
        // console.log(e)
    }
}


export const adminApiClient = async (query: string, variables: any | null = null) => {
    const options = {
        endpoint: `${baseUrl}/graphql.json`,
        method: "POST",
        headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    }
    // var p = new Promise(async (resolve, reject) => {
    //     try {
    //         const data = await fetch(baseUrl, options).then(response => {
    //             return response.json()
    //         })
    //         console.log(data);

    //         resolve(data)
    //     } catch (error) {
    //         reject(error)
    //     }
    // })
    var p = new Promise((resolve, reject) => {
        fetch(options.endpoint, options)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                return response.text();
            })
            .then(text => {
                return JSON.parse(text);
            })
            .then(data => resolve(data))
            .catch(error => reject(error));
    });
    return p
}

export const createOrder = async (order) => {
    // console.log("Order Data:", JSON.stringify(orderData, null, 2)); // Log the order data
    // console.log("Order Data:", JSON.stringify(orderData, null, 2)); // Log the order data

    // console.log(orderData)
    // const orderData = JSON.stringify(order)
    try {
        const response = await axios.post(`${baseUrl}/orders.json`, { order }, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });
        return response.data.order;
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error creating order within createOrder function:', error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Error creating order: No response received', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error creating order:', error.message);
        }
        throw error;
    }
}