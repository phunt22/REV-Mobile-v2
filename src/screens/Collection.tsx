import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState, useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, FlatList, Image, Dimensions, NativeModules, StatusBar, Platform, TouchableOpacity, ScrollView } from 'react-native'
import { BackArrow, BackArrowIcon, SearchIcon } from '../components/shared/Icons'
import ProductCard from '../components/shared/ProductCard'
import { theme } from '../constants/theme'
import { Product } from '../types/dataTypes'
import { MenuStackParamList } from '../types/navigation'
import { storefrontApiClient } from '../utils/storefrontApiClient'
import logo from '../assets/logo.png'
import splash from '../assets/splash.png'
import { TextInput } from 'react-native-gesture-handler'
import Icon from 'react-native-vector-icons/FontAwesome';
import { config } from '../../config'
import { useLocations } from '../context/LocationsContext'


const screenWidth = Dimensions.get('screen').width

type Props = NativeStackScreenProps<MenuStackParamList, 'Collection'>

const Collection = ({ route, navigation }: Props) => {
  const { collectionId } = route.params
  // const { getId } = navigation
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [pTop, setPTop] = useState<number>(0)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchInput);


  const [collection, setCollection] = useState<any | null>(null)
  const { StatusBarManager } = NativeModules
  const [sbHeight, setsbHeight] = useState<any>(StatusBar.currentHeight)
  const [products, setProducts] = useState<Product[]>([])

  const { productIds } = useLocations();
  const [filteredCollectionByLocation, setFilteredCollectionByLocation] = useState<any[] | null>([]);

  const windowWidth = Dimensions.get('window').width
  const screenWidth = Dimensions.get('screen').width

  const debounce = (func, delay) => {
    let inDebounce;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(inDebounce);
      inDebounce = setTimeout(() => func.apply(context, args), delay);
    };
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
    }, 300); // 300ms delay for debouncing
    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);


  // helper method to filter the collection for the given store
  const filterCollection = (collection) => {
    const filteredCollection = []
    collection && collection.products.nodes.map(product => {
      productIds.includes(product.id) && filteredCollection.push(product)
    })
    return filteredCollection
  }


  useEffect(() => {
    if (debouncedSearchTerm) {
      search();
    } else {
      setProducts([]);
    }
  }, [debouncedSearchTerm]);

  //   if (searchInput.length > 0) {
  //     try {
  //       search();
  //     } catch (e) {
  //       if (typeof e === 'string') {
  //         setErrorMessage(e);
  //       } else {
  //         setErrorMessage('Something went wrong. Try again.');
  //       }
  //     }
  //   } else {
  //     setProducts([]);
  //   }
  // }, [searchInput]);

  useEffect(() => {
    if (Platform.OS === "ios") {
      StatusBarManager.getHeight((statusBarHeight: any) => {
        setsbHeight(Number(statusBarHeight.height))
        // console.log(statusBarHeight.height)
      })
    }
  }, [])

  useEffect(() => {
    if (String(navigation.getState().routes[0].name) === 'Home') {
      StatusBarManager.getHeight((statusBarHeight: any) => {
        setsbHeight(Number(statusBarHeight.height))
        // console.log(statusBarHeight.height)
        setPTop(sbHeight + 44)
      })
    }
  })

  useEffect(() => {
    // console.log('title', collection.title)
    navigation.setOptions({
      headerTitle: () => (
        <Text style={styles.screenTitle}>{collection?.title}</Text>
      ),
    })
  }, [collection])

  const fetchDetailedProductInfo = async (filteredProductIds) => {
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
        filteredProductIds.map(async (id: string) => {
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

      const unfilteredProductIds = searchResponse.data.search.edges.map(edge => edge.node.id);

      // commented out, as we have pulled support for this feature
      // const filteredProducts = [];
      // searchResponse.data.search.edges.map(product => {
      //   if (productIds.includes(product.node.id)) {
      //     filteredProducts.push(product.node.id)
      //   }
      // }
      // )

      // fetch more details
      const detailedProducts = await fetchDetailedProductInfo(unfilteredProductIds);
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

  const fetchCollection = async () => {
    setIsLoading(true)
    setErrorMessage('')

    const query = `query getCollectionById($id: ID!) {
      collection(id: $id) {
        title
        description
        image {
          url
          height
          width
        }
        products(first: 200) {
          nodes {
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
            variants(first:200) {
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
      }
    }`

    const variables = { id: collectionId }

    const response: any = await storefrontApiClient(query, variables)

    if (response.errors && response.errors.length != 0) {
      setIsLoading(false)
      throw response.errors[0].message
    }
    setCollection(response.data.collection)
    // setFilteredCollectionByLocation(filterCollection(response.data.collection))

    setIsLoading(false)
  }

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        // <BackArrowIcon
        //   color={'#4B2D83'}
        //   size={20}
        //   onPress={() => navigation.goBack()}
        // />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: -12 }}>
          <BackArrow color={'#4B2D83'}
            size={20}
          />
        </TouchableOpacity>

      ),
      headerTitle: () => (
        // <Text style={styles.title}>{collection?.title || ''}</Text>
        <Image source={logo} style={{ width: 100, height: 50 }} resizeMode="contain" />
      ),
    });

    try {
      fetchCollection()
    } catch (e) {
      if (typeof e == 'string') {
        setErrorMessage(e)
      } else {
        setErrorMessage('Something went wrong. Try again.')
      }
    }
  }, [route.params.collectionId])


  return (
    <View style={{ flex: 1, paddingTop: 10 + pTop, width: '100%' }}>


      {/* search bar */}
      <View style={{ width: '95%', height: 45, backgroundColor: '#D9D9D9', display: 'flex', flexDirection: 'row', alignItems: 'center', borderTopRightRadius: 30, borderBottomRightRadius: 30, marginBottom: 10 }}>
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


      {/* {isLoading ?
        <View style={{ height: '100%', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator style={{ alignSelf: 'center' }} /></View>
        : { searchInput && searchInput.length !== 0 ? <T() : (<FlatList
        data={collection.products.nodes as Product[]}
        renderItem={({ item }) => <ProductCard data={item} />}
        keyboardDismissMode='on-drag'
        showsVerticalScrollIndicator={false}
        numColumns={2}
        contentContainerStyle={styles.container}
        ListHeaderComponent={<View style={{}} />}
      />)}
        
      } */}

      {isLoading ? (
        <View style={{ height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
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
                    renderItem={({ item }) => <ProductCard data={item} />}
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    numColumns={2}
                    contentContainerStyle={styles.container}
                  />
                ) : (
                  <View style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                    {isLoading && !debouncedSearchTerm ? (null) : (<Text style={{}}>No results matching your search</Text>)}

                  </View>
                )
              ) : (

                <View style={{ paddingTop: 10, }}>
                  {/* <PopularThumbNail color='black' size={24} /> */}
                  {collection.length === 0 ? (
                    <View style={{ display: 'flex', width: '100%', height: '90%', justifyContent: 'center', alignItems: 'center' }}>
                      <Text>
                        No items for this category in this store!
                      </Text>
                    </View>
                  ) : (

                    <FlatList
                      // data={collection.products.nodes as Product[]}
                      data={collection.products.nodes as Product[]}
                      renderItem={({ item }) => <ProductCard data={item} />}
                      keyExtractor={(item) => item.id}
                      numColumns={2}
                      contentContainerStyle={{ paddingHorizontal: 14, flexGrow: 1, paddingBottom: 50, }}
                    />
                  )}

                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  )
}

export default Collection

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    // paddingTop: 47 + 47,
    // paddingTop: 0,
  },
  titleContainer: {
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: 'black',
    fontSize: 18,
    letterSpacing: 1.8,
    fontWeight: 'bold'
  },
  text: {
    color: theme.colors.text,
    alignSelf: 'center',
    fontSize: 16,
    letterSpacing: 1.5,
    fontWeight: '300',
    marginBottom: 16,
    textAlign: 'center'
  },
  image: {
    width: screenWidth,
    height: 400,
    marginBottom: 16
  },
  error: {
    color: 'red',
    alignSelf: 'center',
    marginTop: 12
  },
  screenTitle: {
    fontWeight: '800',
    fontSize: 24,
    color: '#4B2D83',
  }
})