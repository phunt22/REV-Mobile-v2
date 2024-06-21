import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, StatusBar, UIManager, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ProductCard from '../shared/ProductCard';
import { fetchCollection } from '../../queries/fetchCollection'
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../types/navigation';
import { useNavigationContext } from '../../context/NavigationContext';
import { BottomSheetSectionList, TouchableHighlight } from '@gorhom/bottom-sheet';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { DownArrowIcon, RightArrowIcon, ViewAllArrow } from '../shared/Icons';
import { useLocations } from '../../context/LocationsContext';
// const [sbHeight, setsbHeight] = useState<any>(StatusBar.currentHeight)

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const MemoizedProductCard = React.memo(ProductCard)

// creates a pair of product cards, so that they are vertically stacked
const ProductCardPair = ({ item1, item2 }) => (
    <View style={{ flexDirection: 'column', display: 'flex' }}>
        {item1 && <View style={{ height: 20 }} />}
        {item1 && <MemoizedProductCard data={item1} />}
        {item2 && <View style={{ height: 20 }} />}
        {item2 && <MemoizedProductCard data={item2} />}
    </View>
)

// pairs our products up so that they fit nicely intp the productcardPairs
// handles the odd case by pushing null on the 2nd element if not present
const pairProducts = (products) => {
    const paired = [];
    for (let i = 0; i < products.length; i += 2) {
        paired.push([products[i], products[i + 1] ? products[i + 1] : null])
    }
    return paired;
}

const fetchUntilMinimum = async (nav, endCursor, minCount, productIds) => {
    let allProducts = [];
    let hasNextPage = true;
    let cursor = endCursor;

    // adding safeguarding for infinite loops
    let itrCount = 0;
    const maxItr = 30;
    while (hasNextPage && allProducts.length < minCount && itrCount < maxItr) {
        itrCount++;
        const { products, hasNextPage: nextPage, endCursor: newCursor } = await fetchCollection(nav, cursor, 8);

        // this is where the filtering happens. Commented out as we are pulling support in this version
        // const filteredProducts = products.filter(product => productIds.includes(product.id));

        // // what about the case when straight up nothing is returned?


        // // Handle case where filteredProducts is empty but more products are available
        // if (filteredProducts.length === 0 && nextPage) {
        //     cursor = newCursor;
        //     hasNextPage = nextPage;
        //     continue;
        // }

        allProducts = [...allProducts, ...products];
        hasNextPage = nextPage;
        cursor = newCursor;
    }


    return { products: allProducts, hasNextPage, endCursor: cursor };
};

const HomeList = ({ navigation }) => {
    const { rootNavigation } = useNavigationContext()

    const { selectedLocation, productIds } = useLocations();
    // const [sectionData, setSectionData] = useState(sections);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [lastLoadedSectionIndex, setLastLoadedSectionIndex] = useState<number>(3)
    const [isVerticalLoading, setIsVerticalLoading] = useState<boolean>(false);
    // const [endCursors, setEndCursors] = useState(Array(sections.length).fill(null))
    // const [hasNextPages, setHasNextPages] = useState(Array(sections.length).fill(true))

    // const [loadingStates, setLoadingStates] = useState(Array(sections.length).fill(false));
    // const [errorStates, setErrorStates] = useState(Array(sections.length).fill(''));
    const [isChangingLocation, setIsChangingLocation] = useState<boolean>(false);
    const [sectionsReady, setSectionsReady] = useState<boolean>(false);


    const initialSections = [
        // all of the sections have a next page by default, and the endCursor object is null by default
        { title: 'Popular', data: [], nav: 'gid://shopify/Collection/456011481376', hasNextPage: true, endCursor: null },
        { title: 'Sweets', data: [], nav: 'gid://shopify/Collection/456011710752', hasNextPage: true, endCursor: null },
        { title: 'Energy', data: [], nav: 'gid://shopify/Collection/456011776288', hasNextPage: true, endCursor: null },
        { title: 'Drinks', data: [], nav: 'gid://shopify/Collection/456011514144', hasNextPage: true, endCursor: null },
        { title: 'Nicotine', data: [], nav: 'gid://shopify/Collection/459750572320', hasNextPage: true, endCursor: null },
        { title: 'International', data: [], nav: 'gid://shopify/Collection/458202546464', hasNextPage: true, endCursor: null },
        { title: 'Ready To Eat', data: [], nav: 'gid://shopify/Collection/456011940128', hasNextPage: true, endCursor: null },
        { title: 'Sweet Treats', data: [], nav: 'gid://shopify/Collection/456011710752', hasNextPage: true, endCursor: null },
        { title: 'Snacks', data: [], nav: 'gid://shopify/Collection/456011546912', hasNextPage: true, endCursor: null },
        { title: 'Chips', data: [], nav: 'gid://shopify/Collection/456011612448', hasNextPage: true, endCursor: null },
        { title: 'Healthy', data: [], nav: 'gid://shopify/Collection/458202448160', hasNextPage: true, endCursor: null },
        { title: 'Candy', data: [], nav: 'gid://shopify/Collection/456011677984', hasNextPage: true, endCursor: null },
        { title: 'Ice Cream', data: [], nav: 'gid://shopify/Collection/456011841824', hasNextPage: true, endCursor: null },
        { title: 'Beer & Wine', data: [], nav: 'gid://shopify/Collection/463924003104', hasNextPage: true, endCursor: null },
        { title: 'Booze', data: [], nav: 'gid://shopify/Collection/463924134176', hasNextPage: true, endCursor: null },
        { title: 'Student Essentials', data: [], nav: 'gid://shopify/Collection/456012038432', hasNextPage: true, endCursor: null },
        { title: 'Personal Care', data: [], nav: 'gid://shopify/Collection/456011972896', hasNextPage: true, endCursor: null },
    ]
    const [sections, setSectionData] = useState(initialSections);





    const clearData = () => {
        setSectionsReady(false);
        // setSectionData(sections.map(section => ({ ...section, data: [] })));
        setSectionData(initialSections);
    };
    useEffect(() => {
        // clears the data so that we dont see it before stuff loads. 

        clearData();

        const fetchInitialData = async () => {
            setIsLoading(true);
            setIsChangingLocation(true);
            try {
                const updatedData = await Promise.all(
                    sections.slice(0, 4).map(async (section) => {
                        const { products, hasNextPage, endCursor } = await fetchUntilMinimum(section.nav, null, 4, productIds);
                        return { ...section, data: products, hasNextPage, endCursor };
                    })
                );
                setSectionData([...updatedData, ...sections.slice(4)]);
                setLastLoadedSectionIndex(3);
            } catch (error) {
                setErrorMessage('Error fetching data');
                console.log('Error loading data: ', error);
            }
            setIsLoading(false);
            setIsChangingLocation(false);  // Set changing location to false after loading
            setSectionsReady(true);
        }
        fetchInitialData();
    }, [selectedLocation, productIds]);

    const handleLoadMore = useCallback(async () => {
        if (isVerticalLoading || lastLoadedSectionIndex > 16) {
            return;
        }
        setIsVerticalLoading(true);
        const start = lastLoadedSectionIndex + 1;
        const end = Math.min(start + 2, sections.length);
        const sectionsToLoad = sections.slice(start, end);
        try {
            const fetchedSections = await Promise.all(
                sectionsToLoad.map(async (section) => {
                    const { products, hasNextPage, endCursor } = await fetchUntilMinimum(section.nav, section.endCursor, 4, productIds);
                    return { ...section, data: [...section.data, ...products], hasNextPage, endCursor };
                })
            );
            setSectionData(currentSections => {
                const updatedSections = [...currentSections];
                fetchedSections.forEach((newSection, index) => {
                    const sectionIndex = start + index;
                    updatedSections[sectionIndex] = newSection;
                });
                return updatedSections;
            });
            setLastLoadedSectionIndex(end - 1);
        } catch (e) {
            setErrorMessage('Error fetching data');
            console.log(e);
        }
        setIsVerticalLoading(false);
    }, [sections, isVerticalLoading, lastLoadedSectionIndex, productIds]);



    const handleCollectionPress = useCallback((collectionId: string) => {
        navigation.navigate('Collection', { collectionId });
    }, [navigation]);

    const MemoizedFullList = React.memo(FullList);


    return (
        <View style={styles.container}>
            {isChangingLocation || !sectionsReady ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#4B2D83" />
                </View>
            ) : (<FullList
                sections={sections}
                onLoadMore={handleLoadMore}
                onCollectionPress={handleCollectionPress}
                isVerticalLoading={isVerticalLoading}
                setSectionData={setSectionData}
            // ListFooterComponent={isLoading ? <ActivityIndicator /> : null}
            // loadingStates={loadingStates}
            // errorStates={errorStates}
            // extraData={sectionData}
            // maintainVisibleContentPosition={true}
            // extraData={{ sections, loadingStates, errorStates }}
            />)}

        </View>
    );
};

interface FullListProps {
    sections: {
        title: string;
        data: any[];
        nav: string;
        hasNextPage: boolean;
        endCursor: string | null;
    }[];
    onLoadMore: () => void;
    onCollectionPress: (collectionId: string) => void;
    isVerticalLoading: boolean;
    setSectionData: (data: any) => void;
}

const FullList = ({ sections, onLoadMore, onCollectionPress, isVerticalLoading, setSectionData }: FullListProps) => {
    const { productIds } = useLocations();

    const handleLoadMoreHorizontal = useCallback(async (sectionIndex) => {
        const section = sections[sectionIndex];
        if (section.hasNextPage) {
            try {
                const { products, hasNextPage, endCursor } = await fetchUntilMinimum(section.nav, section.endCursor, 4, productIds);
                setSectionData((currentSections) => {
                    const updatedSections = [...currentSections];
                    updatedSections[sectionIndex] = {
                        ...section,
                        data: [...section.data, ...products],
                        hasNextPage,
                        endCursor,
                    };
                    return updatedSections;
                });
            } catch (e) {
                console.log('Error fetching more data');
            }
        }
    }, [sections, productIds]);

    // this renders a section (horizontal row)
    const renderSectionItem = ({ item, index }) => {
        const pairedData = pairProducts(item.data);
        return (
            <View style={{ flex: 1, borderWidth: 2, borderColor: '#4B2D83', marginLeft: 15, borderRadius: 30, width: '105%', paddingRight: 30, marginBottom: 28 }}>
                <View style={{ borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5, paddingHorizontal: 20, position: 'absolute', top: -20, left: 4, zIndex: 11, backgroundColor: 'white' }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: '#4B2D83' }}>{item.title}</Text>
                </View>
                <TouchableOpacity onPress={() => onCollectionPress(item.nav)} style={{ borderWidth: 2, borderColor: '#4B2D83', borderRadius: 30, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', top: -12, position: 'absolute', right: 40, zIndex: 1, backgroundColor: 'white', width: 100, height: 23 }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', fontStyle: 'italic', color: '#4B2D83' }}>View all</Text>
                </TouchableOpacity>
                {item.data.length > 0 ? (
                    <FlatList
                        data={pairedData}
                        renderItem={renderProductItem}
                        keyExtractor={(product, index) => index.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        onEndReached={() => handleLoadMoreHorizontal(index)}
                        onEndReachedThreshold={0.8}
                        contentContainerStyle={{}}
                        ListHeaderComponent={<View style={{ height: '100%', width: 10 }}></View>}
                        ListFooterComponent={
                            item.hasNextPage && item.data.length > 0 ? (
                                <View style={styles.footerContainer}>
                                    <ActivityIndicator color="#4B2D83" />
                                </View>
                            ) : null
                        }
                        maintainVisibleContentPosition={{
                            minIndexForVisible: 0,
                            autoscrollToTopThreshold: 0,
                        }}
                    />
                ) : !item.hasNextPage ?
                    <View style={styles.emptyContainer}>
                        <Text>No products available</Text>
                    </View> :
                    <View style={styles.emptyContainer}>
                        <ActivityIndicator />
                    </View>
                }
            </View>
        );
    };

    const renderProductItem = useCallback(({ item }) => (
        <View style={{ width: 180, marginRight: 25 }}>
            <ProductCardPair item1={item[0]} item2={item[1]} />
        </View>
    ), []);

    return (
        <FlatList
            ListHeaderComponent={<View style={{ width: '100%', height: 20 }}></View>}
            data={sections}
            renderItem={renderSectionItem}
            keyExtractor={(item) => item.title}
            onEndReached={onLoadMore}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={30}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // paddingBottom: 320
        // Add any other styles for the container
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f0f0f0',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 440,
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 440,
        paddingHorizontal: 16,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 250,
        paddingHorizontal: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#999999',
    },
    footerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        height: '100%'
    },
});

export default HomeList;