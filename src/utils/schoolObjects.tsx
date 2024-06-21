import { config } from "../../config";

export const stores = {
    "UW Store": {
        "logo_color": config.primaryColor,
        "name": "UW Seattle",
        "logo_path": require('../assets/storeLogos/UW_Seattle_Logo.png'),
        "phone": "+12068336358", // phone number, not formatted

        // latitude and longitude
        // delivery image
    },
    "Testing_Scaling": {
        "logo_color": "red",
        "name": "EVIL REV",
        "logo_path": require('../assets/storeLogos/FREAKYEMOJI.jpeg')
    }
}