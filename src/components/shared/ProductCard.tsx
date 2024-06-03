import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Dimensions, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../constants/theme';
import { useNavigationContext } from '../../context/NavigationContext';
import { CartItem, Product } from '../../types/dataTypes';
// import Icon from 'react-native-vector-icons/FontAwesome';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCartContext } from '../../context/CartContext';
import { storefrontApiClient } from '../../utils/storefrontApiClient';
import debounce from 'lodash/debounce';
import { CartIcon } from './Icons';
import { Animated } from 'react-native';
import fonts from '../../../App'
import { useStoreClosed } from '../../context/StoreClosedContext';


const ProductCard = memo(({ data }: { data: Product }) => {
  const { rootNavigation } = useNavigationContext();
  const { getItemsCount, getProductQuantityInCart } = useCartContext();
  const { addItemToCart, substractQuantityOfItem, addQuantityOfItem } = useCartContext();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [numInCart, setNumInCart] = useState<number>(getProductQuantityInCart(data.title));
  const [cartItem, setCartItem] = useState<CartItem | null>(null); // this is where the actual product item is stored
  const { userContinueAnyways } = useStoreClosed();

  const [selectedOptions, setSelectedOptions] = useState(
    data && data.options
      ? data.options.map((option) => ({
        name: option.name,
        value: option.values.length === 1 ? option.values[0] : null,
      }))
      : []
  );

  // ANIMATIONS HANDLED HERE
  const rotationAnim = useRef(new Animated.Value(0)).current
  const rotate = () => {
    Animated.timing(rotationAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => rotationAnim.setValue(0))
  }
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-90deg']
  })

  const handleAddToCart = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      // we use cartItem and checking because it is a lot faster, we avoid having to fetch the cartItem every time!
      if (!cartItem) {
        const query = `query getProductById($id: ID!) {
          product(id: $id) {
            variantBySelectedOptions(selectedOptions: ${JSON.stringify(selectedOptions).replaceAll(`"name"`, `name`).replaceAll(`"value"`, `value`)}) {
              id
              title
              image {
                url
                width
                height
              }
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
              product {
                title
              }
              availableForSale
              quantityAvailable
              selectedOptions {
                value
              }
            }
          }
        }`

        const variables = { id: data.id }

        const response: any = await storefrontApiClient(query, variables)

        if (response.errors && response.errors.length != 0) {
          throw response.errors[0].message
        }

        setCartItem(response.data.product.variantBySelectedOptions)
        // DO NOT USE cartItem, useState batches updates
        const newCartItem = response.data.product.variantBySelectedOptions
        if (newCartItem.availableForSale) {
          addItemToCart(response.data.product.variantBySelectedOptions as CartItem, 1)
          setNumInCart(prev => prev + 1)
        }

      } else {
        if (cartItem.quantityAvailable > numInCart) {
          addItemToCart(cartItem, 1)
          setNumInCart(prev => prev + 1)
        } else {
          // we arent moving (zero motion, we hit the cap)
        }

      }
      // setNumInCart(prev => prev + 1) // handle the local showing. Doesn't do this automatically because we don't need to re-render (intended)
    } catch (e) {
      if (typeof e == 'string') {
        setErrorMessage(e)
      } else {
        setErrorMessage('Something went wrong. Try again.')
      }
    }
    setIsLoading(false)
  }

  const handleSubtractFromCart = async () => {
    setIsLoading(true);

    try {
      if (!cartItem) {
        const query = `query getProductById($id: ID!) {
        product(id: $id) {
          variantBySelectedOptions(selectedOptions: ${JSON.stringify(selectedOptions).replaceAll(`"name"`, `name`).replaceAll(`"value"`, `value`)}) {
            id
            title
            image {
              url
              width
              height
            }
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            product {
              title
            }
            availableForSale
            quantityAvailable
            selectedOptions {
              value
            }
          }
        }
      }`
        const variables = { id: data.id }
        const response: any = await storefrontApiClient(query, variables)
        if (response.errors && response.errors.length != 0) {
          throw response.errors[0].message
        }
        setCartItem(response.data.product.variantBySelectedOptions)
        substractQuantityOfItem(response.data.product.variantBySelectedOptions.id, 1)
      } else {
        substractQuantityOfItem(cartItem.id, 1)
      }
      setNumInCart((prev) => prev - 1)
    } catch (e) {
      if (typeof e == 'string') {
        setErrorMessage(e)
      } else {
        setErrorMessage('Something went wrong. Try again.')
      }
    }
    setIsLoading(false);
  }


  // future code to update the number of items in the cart
  // basically would just add the localChanges to the num in cart, so that it's reponsive

  // at the moment is only displaying the getItemsCount
  useEffect(() => {
    // gid://shopify/Product/8633387843872
    rootNavigation.setOptions({
      headerRight: () => (
        <>
          <TouchableOpacity style={{ paddingRight: 10 }} onPress={() => {
            rootNavigation.goBack()
            rootNavigation.push('Cart')
          }}>
            <CartIcon color="#4a307e" size={24} />
            {getItemsCount() > 0 && (
              <View style={{
                position: 'absolute',
                right: 25,
                bottom: -7,
                backgroundColor: '#4a307e',
                borderRadius: 10,
                width: 30,
                height: 30,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'white'
              }}>
                <Text style={{
                  color: 'white',
                  // fontSize: 10,
                  fontWeight: 'bold'
                }}>
                  {getItemsCount()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      ),
    })
  }, [])

  // gotta use useCallback otherwise the timer gets deleted. Some weird React thing.




  // this will set the cart Item to grab from the parameters. 
  // obviously want to minize the number of calls to this, so it should be wrapped in if statement. 
  const getCartItem = async () => {
    const query = `
                      query getProductById($id: ID!) {
                        product(id: $id) {
                          variantBySelectedOptions(selectedOptions: ${JSON.stringify(selectedOptions)
        .replaceAll(`"name"`, `name`)
        .replaceAll(`"value"`, `value`)}) {
                            id
                            title
                            image {
                              url
                              width
                              height
                            }
                            price {
                              amount
                              currencyCode
                            }
                            compareAtPrice {
                              amount
                              currencyCode
                            }
                            product {
                              title
                            }
                            availableForSale
                            quantityAvailable
                            selectedOptions {
                              value
                            }
                          }
                        }
                      }
                    `;
    const variables = { id: data.id };
    const response: any = await storefrontApiClient(query, variables);
    if (response.errors && response.errors.length !== 0) {
      throw response.errors[0].message;
    }
    // setCartItem(response.data.product.variantBySelectedOptions);
    return response.data.product.variantBySelectedOptions;
  }

  const selectedItem = useMemo(
    () =>
      data.variants.nodes.find((item) =>
        item.selectedOptions.every((option, index) => option.value === selectedOptions[index].value)
      ) || null,
    [selectedOptions, data.variants.nodes]
  );


  // can we just grab the cartItem with data.id? We have a query for that
  // console.log(data.id) // aka we can get the id really easily

  const noVariants = useMemo(
    () =>
      data.variants.nodes.length <= 1 &&
      data.variants.nodes[0].selectedOptions.length <= 1 &&
      data.variants.nodes[0].selectedOptions[0].value === 'Default Title',
    [data.variants.nodes]
  );

  const handlePressProduct = () => {
    rootNavigation.push('ProductScreen', { data });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePressProduct} disabled={!selectedItem?.availableForSale}>
        <View>
          <Image source={{ uri: data.images.nodes[0].url }} style={styles.image} />
          <View>
            <Text style={{
              marginTop: 10,
              paddingRight: 14,
              fontSize: 14,
              fontWeight: '500',
              color: 'black',
              // letterSpacing: 1,
              paddingBottom: 8,
            }}
              numberOfLines={1} ellipsizeMode="tail">
              {data.title}
            </Text>
            <View style={styles.priceContainer}>
              {data.compareAtPriceRange.minVariantPrice.amount > data.priceRange.minVariantPrice.amount && (
                <Text style={styles.compareAtPrice}>{data.compareAtPriceRange.minVariantPrice.amount}</Text>
              )}
              {selectedItem?.availableForSale ? (
                // <Text style={styles.price}>${data.priceRange.minVariantPrice.amount}</Text>
                <Text style={styles.price}>

                  ${data.priceRange.minVariantPrice.amount.toString().split('.')[0]}.
                  <Text style={styles.smallPrice}>
                    {(data.priceRange.minVariantPrice.amount.toString().split('.')[1] || '') +
                      (data.priceRange.minVariantPrice.amount.toString().split('.')[1]?.length === 1 ? '0' : '')}

                    {/* {(data.priceRange.minVariantPrice.amount.toString().split('.')[1])} */}

                  </Text>
                </Text>
              ) : (
                <Text style={styles.outOfStock}>Out of Stock</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity >
      <View style={styles.cartContainer} >


        {/* Add and subtract */}
        {data.availableForSale && !userContinueAnyways ? (
          <View style={{ display: 'flex', flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', marginRight: 10, marginBottom: 0 }}>
            {numInCart > 0 ?
              (<>
                <TouchableOpacity onPress={handleSubtractFromCart}>
                  {/* <Text>-</Text> */}
                  {numInCart === 1 ? (<Image
                    source={require('../../assets/TrashCan.png')}
                    style={styles.trashCanImage}
                    resizeMode="contain"
                  />) : (
                    <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -4 }}>
                      <Text style={{ color: "#4B2D83", fontSize: 38, fontWeight: '800', marginBottom: -1 }}>-</Text>
                    </View>

                    // <FontAwesome name="minus" size={30} color="#4B2D83" />
                    // <FontAwesome name="minus" size={20} color="#4B2D83" />
                  )}
                </TouchableOpacity>
                <Text style={{ color: 'black', fontWeight: '600', fontSize: 20, marginHorizontal: 8 }}>
                  {numInCart}
                </Text>
              </>) : (<></>)}

            <TouchableOpacity onPress={() => {
              if (numInCart === 0) {
                rotate();
              }

              handleAddToCart();
            }}>
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <View style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', }}>
                  <Text style={{ color: "#4B2D83", fontSize: 32, fontWeight: '900', marginBottom: 3 }}>+</Text>
                </View>

                {/* <FontAwesome name="plus" size={25} color="#4B2D83" /> */}
              </Animated.View>

            </TouchableOpacity>
          </View>
        ) : (<></>)}
      </View>
    </View >
  );
});

const screenWidth = Dimensions.get('screen').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 16,
    justifyContent: 'space-between',
    maxHeight: ((screenWidth - 28 - 14) / 2) * 1.5 + 130,
    padding: 5,
    borderRadius: 15,
  },
  text: {
    marginTop: 10,
    paddingRight: 14,
    fontSize: 14,
    fontWeight: '500',
    color: 'black',
    // letterSpacing: 1,
    paddingBottom: 8,
  },
  price: {
    marginTop: 2,
    // fontSize: 16.2, v1 fontSizing
    fontSize: 18,
    fontWeight: '800',
    color: '#4B2D83',
  },
  smallPrice: {
    marginTop: 2,
    // fontSize: 13, v1 fontSizing
    fontSize: 15,
    fontWeight: '800',
    color: '#4B2D83',
  },
  outOfStock: {
    marginTop: 0,
    fontSize: 16.2,
    fontWeight: '500',
    color: '#ccc',
  },
  image: {
    alignSelf: 'center',
    width: ((screenWidth - 28 - 14) / 2) * 0.8,
    height: ((screenWidth - 28 - 14) / 2) * 1.5 * 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
  },
  compareAtPrice: {
    marginTop: 2,
    marginRight: 4,
    fontSize: 11,
    fontWeight: '400',
    color: theme.colors.text,
    textDecorationLine: 'line-through',
  },
  plusIcon: {
    padding: 4,
    // marginRight: -4,
    // marginTop: 2,
    shadowColor: '#171717',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,

    // this is to move it up so that it is in the same place as other one, aka doesnt move onPress
    // marginTop: -2,
    marginRight: 6,
    marginBottom: 1

  },
  cartContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  activityIndicator: {
    alignSelf: 'center',
  },
  checkmarkContainer: {
    width: 100,
    height: 36,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    // borderWidth: 1,
    shadowColor: '#171717',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  checkmarkContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '85%',
  },
  trashCanIcon: {},
  trashCanImage: {
    height: 28,
    width: 28,
    marginRight: -5,
    marginBottom: -2
  },
  minusIcon: {
    color: '#4B2D83',
    fontWeight: '800',
    fontSize: 40,
    marginTop: -8,
    marginLeft: 2
  },
  numInCartText: {
    color: 'black',
    fontSize: 25,
    textAlign: 'center',
    fontWeight: 'bold',
    minWidth: 38,
    marginRight: -4
  },
});

export default ProductCard;