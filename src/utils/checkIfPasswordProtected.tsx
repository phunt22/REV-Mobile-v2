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
