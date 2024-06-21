import { View, Text, StyleSheet, TextInput, Dimensions, FlatList, ActivityIndicator, ScrollView, Image } from 'react-native'
import React, { useEffect, useState } from 'react'
import { theme } from '../constants/theme'
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SearchStackParamList } from '../types/navigation';
import { storefrontApiClient } from '../utils/storefrontApiClient';
import { Product } from '../types/dataTypes';
import ProductCard from '../components/shared/ProductCard';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNavigationContext } from '../context/NavigationContext';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchIcon } from '../components/shared/Icons';
import Icon from 'react-native-vector-icons/FontAwesome';


// importing all of the thumbnails
import AllProducts from '../assets/searchThumbnails/AllProducts.png'
import Beer from '../assets/searchThumbnails/Beer.png'
import Booze from '../assets/searchThumbnails/Booze.png'
import Candy from '../assets/searchThumbnails/Candy.png'
import Chips from '../assets/searchThumbnails/Chips.png'
import Drinks from '../assets/searchThumbnails/Drinks.png'
import Energy from '../assets/searchThumbnails/Energy.png'
import Healthy from '../assets/searchThumbnails/Healthy.png'
import Ice_Cream from '../assets/searchThumbnails/Ice_Cream.png'
import International from '../assets/searchThumbnails/International.png'
import Personal from '../assets/searchThumbnails/Personal.png'
import Popular from '../assets/searchThumbnails/Popular.png'
import Ready from '../assets/searchThumbnails/Ready.png'
import Snacks from '../assets/searchThumbnails/Snacks.png'
import Student from '../assets/searchThumbnails/Student.png'
import Sweet from '../assets/searchThumbnails/Sweet.png'
import Nicotine from '../assets/searchThumbnails/Nicotine.png'
import { useStoreClosed } from '../context/StoreClosedContext';
import { FontAwesome } from '@expo/vector-icons';
import { config } from '../../config';
import { useAuthContext } from '../context/AuthContext';
import { useLocations } from '../context/LocationsContext';
import { adminApiClient } from '../utils/checkIfPasswordProtected';

type Props = NativeStackScreenProps<SearchStackParamList, 'Search'>

const Search = ({ navigation }: Props) => {
  const [searchInput, setSearchInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [initialProducts, setInitialProducts] = useState<Product[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<any[]>([]);

  const [error, setError] = useState(null)

  const { userContinueAnyways } = useStoreClosed();
  const { userToken } = useAuthContext();
  const { rootNavigation } = useNavigationContext()

  const { locations, selectedLocation, inventoryLevels, productIds, selectLocation, isLoading: isLocationsLoading, error: locationsError } = useLocations();


  // useEffect(() => {
  //   console.log(inventoryLevels.length)
  //   console.log(inventoryLevels[0])
  // }, [inventoryLevels])

  useEffect(() => {
    if (userContinueAnyways) {
      navigation.setOptions({
        headerLeft: () => (
          <View style={{ height: '100%', marginTop: 8, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
            <FontAwesome name="moon-o" size={22} color={config.primaryColor} />
            <Text style={{ fontSize: 18, fontWeight: '700', marginLeft: 6, color: config.primaryColor, marginTop: 0 }}>
              CLOSED
            </Text>
          </View >
        ),
      })
    } else if (!userToken) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity onPress={() => rootNavigation.navigate('LoginStackNavigator', {
            screen: 'Login',
          })}
            style={{ backgroundColor: config.primaryColor, width: 80, height: 28, marginTop: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 30 }}>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
              Log in
            </Text>
          </TouchableOpacity>
          // <Text>
          //   Test
          // </Text>
          // <TouchableOpacity onPress={() => rootNavigation.navigate('LoginStackNavigator', {
          //   screen: 'Login',
          // })} style={{ backgroundColor: config.primaryColor, width: 40, justifyContent: 'center', alignItems: 'center', height: 10, borderRadius: 30 }}>
          //   <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>Log In</Text>
          // </TouchableOpacity>
        ),
      })
    } else {
      navigation.setOptions({
        headerLeft: () => (
          <></>
        ),
      })
    }
  }, [userContinueAnyways, userToken])


  const fetchProductsByInventoryItemIds = async (inventoryItemIds) => {
    const query = `
      query getProductsByInventoryItemIds($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on InventoryItem {
            variants(first: 200) {
              edges {
                node {
                  product {
                    id
                    title
                    description
                    vendor
                    availableForSale
                    options {
                      id
                      name
                      values
                    }
                    priceRange {
                      minVariantPrice {
                        amount
                        currencyCode
                      }
                    }
                    compareAtPriceRange {
                      minVariantPrice {
                        amount
                        currencyCode
                      }
                    }
                    images(first: 10) {
                      edges {
                        node {
                          url
                          width
                          height
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response: any = await adminApiClient(query, { ids: inventoryItemIds });
      if (response.errors) {
        console.error("Error fetching products:", response.errors);
        throw new Error(response.errors[0].message);
      }

      const products = response.data.nodes.flatMap(node => node.variants.edges.map(edge => edge.node.product));
      setProducts(products);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };



  const fetchCollections = async () => {
    setIsLoading(true);
    setErrorMessage("");

    const query = `query {
      collections(first: 20) {
        edges {
          node {
            id
            title
            description
            image {
              url
              height
              width
            }
          }
        }
      }
    }`;

    const response: any = await storefrontApiClient(query);

    if (response.errors && response.errors.length != 0) {
      setIsLoading(false);
      throw response.errors[0].message;
    }
    setCollections(response.data.collections.edges.map((edge: any) => edge.node));

    setIsLoading(false);
  };



  // this is to render it as the title
  // useEffect(() => {
  //   navigation.setOptions({
  //     headerTitle: () => (
  //       <TextInput
  //         placeholder='Search our store'
  //         placeholderTextColor={theme.colors.disabledText}
  //         style={styles.input}
  //         onChangeText={(text) => setSearchInput(text)}
  //         autoCapitalize='none'
  //       />
  //     )
  //   })

  //   if (searchInput.length > 0) {
  //     try {
  //       fetchInitialProducts()
  //     } catch (e) {
  //       if (typeof e == 'string') {
  //         setErrorMessage(e)
  //       } else {
  //         setErrorMessage('Something went wrong. Try again.')
  //       }
  //     }
  //   }
  // }, [])

  useEffect(() => {
    fetchCollections();
    // console.log('popular:');
    // console.log(Popular);
  }, []);

  const fetchDetailedProductInfo = async (productIds) => {
    const GET_PRODUCT_DETAILS_QUERY = `
query getProductDetails($id: ID!) {
  node(id: $id) {
    ... on Product {
      id
      title
      description
      vendor
      availableForSale
      options {
        id
        name
        values
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 200) {
        nodes {
          availableForSale
          selectedOptions {
            value
          }
        }
      }
      images(first: 10) {
        nodes {
          url
          width
          height
        }
      }
    }
  }
}`;
    try {
      const detailedProductInfo = await Promise.all(
        productIds.map(async (id: string) => {
          const response: any = await storefrontApiClient(GET_PRODUCT_DETAILS_QUERY, { id });
          if (response.errors) {
            console.error("Error fetching details for product ID:", id, response.errors);
            throw new Error(`Failed to fetch details for product ID: ${id}`);
          }
          return response.data.node;
        })
      );
      return detailedProductInfo;
    } catch (error) {
      console.error("Error fetching detailed product information:", error);
      throw error;
    }
  };




  // old search
  const search = async () => {
    setIsLoading(true);
    setErrorMessage('');

    const SEARCH_PRODUCTS_QUERY = `
      query searchProducts($query: String!, $first: Int) {
        search(query: $query, first: $first, types: PRODUCT) {
          edges {
            node {
              ... on Product {
                id
                title
                tags
                vendor
                description
                availableForSale
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    `;

    // const SEARCH_PRODUCTS_QUERY_VARIABLES = { query: `title:*${searchInput}* OR tags:*${searchInput}* OR description:*${searchInput}*`, first: 25 };

    const formattedSearchInput = `"${searchInput}" OR tags:${searchInput}*`;
    const SEARCH_PRODUCTS_QUERY_VARIABLES = { query: formattedSearchInput, first: 25 };

    try {
      const searchResponse: any = await storefrontApiClient(SEARCH_PRODUCTS_QUERY, SEARCH_PRODUCTS_QUERY_VARIABLES);

      if (searchResponse.errors && searchResponse.errors.length > 0) {
        console.error("Search API error:", searchResponse.errors);
        setErrorMessage("Failed to fetch products from search.");
        setIsLoading(false);
        return;
      }

      // // Assuming the API call is successful and data is retrieved properly
      const productIds = searchResponse.data.search.edges.map(edge => edge.node.id);

      // Filter products based on product IDs from inventory levels

      // we want to check if the items returned in the search are in the productIds array


      // console.log(searchResponse.data.search.edges)
      // const filteredProducts = searchResponse.data.search.edges.filter(product => productIds.includes(product.node));


      // searchResponse.data.search.edges.map(product => console.log(product.node.id))
      // searchResponse.data.search.edges.map(product => productIds.includes(product.node.id))

      // this is where the magic happens!
      // products are filtered against the current stores inventory
      // commented out because we are pulling support for multiple locations
      // const filteredProducts = [];
      // searchResponse.data.search.edges.map(product => {
      //   if (productIds.includes(product.node.id)) {
      //     filteredProducts.push(product.node.id)
      //   }
      // })


      // console.log(product.node.id))


      // console.log(filteredProducts)

      // fetch more details
      const detailedProducts = await fetchDetailedProductInfo(productIds);
      const sortedProducts = detailedProducts.sort((a, b) => {
        const titleMatchA = a.title.toLowerCase() === searchInput.toLowerCase() ? 1 : 0;
        const titleMatchB = b.title.toLowerCase() === searchInput.toLowerCase() ? 1 : 0;
        const tagMatchA = a.tags?.includes(searchInput) ? 1 : 0;
        const tagMatchB = b.tags?.includes(searchInput) ? 1 : 0;
        return titleMatchB + tagMatchB - (titleMatchA + tagMatchA);
      });

      setProducts(sortedProducts);
      // setProducts(detailedProducts);
    } catch (error) {
      console.error("An error occurred during the search:", error);
      setErrorMessage(error.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchInput.trim().length > 0) {
      try {
        search();
      } catch (e) {
        if (typeof e === 'string') {
          setErrorMessage(e);
        } else {
          setErrorMessage('Something went wrong. Try again.');
        }
      }
    } else {
      setProducts([]);
    }
  }, [searchInput]);

  const renderCollectionItem = ({ item }: { item: any }) => {
    let thumbnail = <></>;
    const w = windowWidth * 0.5 // this should be 0.427, but there is x-margin in the png
    // is this the best way to do it? 
    // can't change the photos in the field so I am storing them locally and then setting it based on the title.
    // in a perfect world, the image field on the shopify would be the correct photo

    // additionally, some weird behavior because some of them are hardcoded
    if (item.title === 'All Products') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={AllProducts} />
    } else if (item.title === 'Beer & Wine') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Beer} />
    } else if (item.title === 'Booze etc.') {
      thumbnail = <View style={{ flexDirection: 'row', justifyContent: 'flex-start', width: '100%' }}><Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Booze} /></View>

    } else if (item.title === 'Candy') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Candy} />
    } else if (item.title === 'Drinks') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Drinks} />
    } else if (item.title === 'Energy') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Energy} />
    } else if (item.title === 'Chips') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Chips} />
    } else if (item.title === 'Healthy') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Healthy} />
    } else if (item.title === 'Ice Cream') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Ice_Cream} />
    } else if (item.title === 'International') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={International} />
    } else if (item.title === 'Personal Care') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Personal} />
    } else if (item.title === 'Popular') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Popular} />
    } else if (item.title === 'Ready To Eat') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Ready} />
    } else if (item.title === 'Snacks') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Snacks} />
    } else if (item.title === 'Student Essentials') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Student} />
    } else if (item.title === 'Sweet Treats') {
      thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Sweet} />
    } else if (item.title === 'Nicotine') {
      thumbnail = <Image style={{
        width: 0.9 * w, height: 0.6 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Nicotine} />
    } else {
      return;
    }
    if (item.id === 'placeholder') {
      return thumbnail = <Image style={{
        width: w, height: 0.65 * w,
        // backgroundColor: 'black' 
      }} resizeMode="cover"
        source={Nicotine} />
    }

    return (
      <TouchableOpacity style={styles.collectionContainer} onPress={() => {
        // console.log(item)
        navigation.navigate('Collection', { collectionId: item.id })
      }}>
        {/* <Text style={styles.text}>{item.title}</Text> */}
        {thumbnail}
      </TouchableOpacity>
    )
  }

  // old code to render a collection item

  return (
    <View style={{ marginTop: 10, flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ width: '95%', height: 45, backgroundColor: '#D9D9D9', display: 'flex', flexDirection: 'row', alignItems: 'center', borderTopRightRadius: 30, borderBottomRightRadius: 30 }}>
        <View style={{ marginLeft: 20 }}>
          <SearchIcon color='black' size={20} />
        </View>

        <TextInput
          placeholder='Search'
          placeholderTextColor={theme.colors.disabledText}
          style={{ backgroundColor: '#D9D9D9', width: windowWidth - 100, marginLeft: 6, fontSize: 18, fontWeight: '500', padding: 10 }}
          onChangeText={(text) => setSearchInput(text)}
          value={searchInput}
          autoCapitalize='none'
          autoCorrect={false}
        />
        {searchInput && searchInput.length !== 0 ? (<TouchableOpacity onPress={() => setSearchInput('')}
          style={{ width: 25, height: 25, borderRadius: 20, backgroundColor: 'gray', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
        >
          <Text style={{ color: 'white', fontWeight: '900' }}>X</Text>
          {/* <Icon name="times-circle" size={25} color='white' /> */}
        </TouchableOpacity>) : (null)}
      </View>

      {isLoading ? (
        <View style={styles.activityContainer}>
          <ActivityIndicator size={"small"} />
        </View>
      ) : (
        <>
          {errorMessage !== "" ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : (
            <>
              {searchInput.length > 0 ? (
                products.length !== 0 ? (
                  <FlatList
                    data={products}
                    renderItem={({ item }) => {
                      return (<ProductCard data={item} />)
                    }}
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    numColumns={2}
                    contentContainerStyle={styles.container}
                  />
                ) : (
                  <View style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                    <Text style={{}}>No results matching your search</Text>
                  </View>
                  // TODO I dont think this actually shows up
                  // <ScrollView
                  //   contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                  //   scrollEnabled={false}
                  //   keyboardDismissMode="on-drag"
                  // >

                  // </ScrollView>
                )
              ) : (

                <View style={{ paddingTop: 10, }}>
                  {/* <PopularThumbNail color='black' size={24} /> */}

                  <FlatList
                    data={collections}
                    renderItem={renderCollectionItem}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={{ paddingHorizontal: 14, flexGrow: 1, paddingBottom: 50, }}
                  />
                </View>
              )}
            </>
          )}
        </>
      )
      }
    </View >
  );
}

const windowWidth = Dimensions.get('window').width
const screenWidth = Dimensions.get('screen').width


const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingLeft: 14,
    // marginBottom: 100,
    // paddingBottom: 120,
  },
  text: {
    color: '#FFFFFF',
    alignSelf: 'center',
    fontSize: 16,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center'
  },
  input: {
    marginTop: 16,
    width: windowWidth - 28,
    fontSize: 16,
    zIndex: 10,
    padding: 8,
    paddingHorizontal: 4,
    color: theme.colors.text,
  },
  activityContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  error: {
    color: 'red',
    alignSelf: 'center',
    marginTop: 12
  },
  collectionContainer: {
    flex: 1,
    // paddingBottom: 16,
    justifyContent: 'center',
    // alignItems: 'flex-start',
    alignItems: 'center',
    // maxHeight: (((screenWidth - 28 - 14) / 2) * 1.5 + 130) * 0.2,
    // borderColor: '#4B2D83',
    // borderWidth: 2,
    // padding: 5,
    borderRadius: 15,
    // backgroundColor: 'orange'
    // height: '95%'
    // margin: 5,
    // marginTop: 12,
    // backgroundColor: 'purple'
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 1.8,
    fontWeight: '500'
  },
  gradient: {
    // flex: 1,
    // width: '100%',
    // borderRadius: 15, // Match your TouchableOpacity's borderRadius
    // justifyContent: 'center', // Center the children vertically
    // alignItems: 'center', // Center the children horizontally
  },
})

export default Search