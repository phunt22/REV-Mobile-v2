import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { adminApiClient } from '../utils/checkIfPasswordProtected';

type AddressType = {
  address1: string;
  address2: string;
  city: string;
  province: string;
  country: string;
  zip: string;
};

type LocationType = {
  id: string;
  name: string;
  address: AddressType;
  isOpen: boolean; // field for if store closed or not
  storeHours: string; // field that tells us the hours of the store in string format. Pulled from the shopify Admin. 
};

// type of an inventory level. There is one per store, and we pretty much just need the item ids. 
type InventoryLevelType = {
  id: string;
  quantities: { name: string; quantity: number }[];
  item: {
    id: string;
    sku: string;
    tracked: boolean;
  };
}

type LocationsContextType = {
  locations: LocationType[];
  selectedLocation: LocationType | null;
  inventoryLevels: InventoryLevelType[];
  productIds: any[];
  isLoading: boolean;
  error: string | null;
  selectLocation: (location: LocationType) => void;
  resetLocation: () => void;
  isLocationOpen: (locationId: string) => Promise<boolean>;
  updateLocationStatus: (locationId: string, isOpen: boolean) => void;
};

const LocationsContext = createContext<LocationsContextType | undefined>(undefined);

type Props = { children: ReactNode };

export const LocationsProvider = ({ children }: Props) => {
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(null);
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevelType[]>([]);
  const [productIds, setProductIds] = useState<any[]>([]); // stores all the product IDs to compare


  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getAllLocations = async () => {
      const query = `
      query {
        locations(first: 250) {
          edges {
            node {
              id
              name
              address {
                address1
                address2
                city
                province
                country
                zip
              }
              storeHours: metafield(namespace: "custom", key: "store_hours") {
                value
              }
              isOpen: metafield(namespace: "custom", key: "isOpen") {
                value
              }
            }
          }
        }
      }
      
      `;
      setIsLoading(true);
      setError(null);

      try {
        const response: any = await adminApiClient(query);
        if (response.errors && response.errors.length !== 0) {
          throw new Error(response.errors[0].message);
        }

        // Extract locations
        // const locations = response.data.locations.edges.map((edge: any) => edge.node);

        // Extract locations and their store status
        // have to do it this way bc isOpen could be null, but we want it to be false in the case that its null
        const locations = response.data.locations.edges.map((edge: any) => ({
          id: edge.node.id,
          name: edge.node.name,
          address: edge.node.address,
          isOpen: edge.node.isOpen ? edge.node.isOpen.value === "true" : false, // if its not null then we set it to the value, else false (failsafe)
          storeHours: edge.node.storeHours ? edge.node.storeHours.value : "", // if its not null, then we set it to them, else empty string
        }));
        setLocations(locations);
      } catch (error: any) {
        console.error('Error fetching locations:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    getAllLocations();
  }, [selectedLocation]);

  // old method
  // takes in a locationID, and then fetches all of the inventory for that given location so that we can store it
  // const fetchInventoryLevelsByLocation = async (locationId: string) => {
  //     let hasNextPage = true;
  //     let after = null;
  //     const allInventoryLevels = [];
  //     let count = 0;

  //     while (hasNextPage) {
  //         const query = `
  //         query getLocationInventoryLevels($locationId: ID!, $after: String) {
  //           location(id: $locationId) {
  //             id
  //             name
  //             inventoryLevels(first: 250, after: $after) {
  //               edges {
  //                 node {
  //                   id
  //                   quantities(names: ["available"]) {
  //                     name
  //                     quantity
  //                   }
  //                   item {
  //                     id
  //                     sku
  //                     tracked
  //                   }
  //                 }
  //               }
  //               pageInfo {
  //                 hasNextPage
  //                 endCursor
  //               }
  //             }
  //           }
  //         }
  //       `;

  //         setIsLoading(true);
  //         setError(null);

  //         try {
  //             const response: any = await adminApiClient(query, { locationId, after });

  //             if (response.errors) {
  //                 throw new Error(response.errors[0].message);
  //             }

  //             const inventoryLevels = response.data.location.inventoryLevels.edges.map((edge: any) => edge.node);
  //             allInventoryLevels.push(...inventoryLevels);

  //             hasNextPage = response.data.location.inventoryLevels.pageInfo.hasNextPage;
  //             after = response.data.location.inventoryLevels.pageInfo.endCursor;

  //         } catch (error: any) {
  //             console.error('Error fetching inventory levels:', error);
  //             setError(error.message);
  //             hasNextPage = false;
  //         } finally {
  //         }

  //         console('fetching number' + count++ + isLoading)
  //     }
  //     setIsLoading(false);
  //     setInventoryLevels(allInventoryLevels);
  // };

  // new fetch inventory level to get the product IDs
  const fetchInventoryLevelsByLocation = async (locationId: string) => {
    // these are for pagination
    let hasNextPage = true;
    let after = null;

    // these are storing inventory IDs and product IDs
    const allInventoryLevels = [];
    const productIds = new Set(); // no dupes

    while (hasNextPage) {
      const query = `
            query getLocationInventoryLevels($locationId: ID!, $after: String) {
                location(id: $locationId) {
                  id
                  name
                  inventoryLevels(first: 250, after: $after) {
                    edges {
                      node {
                        id
                        quantities(names: ["available"]) {
                          name
                          quantity
                        }
                        item {
                          id
                          sku
                          tracked
                          variant {
                                product {
                                  id
                            }
                          }
                        }
                      }
                    }
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                  }
                }
              }
          `;

      setIsLoading(true);
      setError(null);

      try {
        const response: any = await adminApiClient(query, { locationId, after });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        const inventoryLevels = response.data.location.inventoryLevels.edges.map((edge: any) => edge.node);
        allInventoryLevels.push(...inventoryLevels);

        inventoryLevels.forEach(level => {
          const variants = level.item.variant;
          if (variants && variants.product) {
            productIds.add(variants.product.id);
          }
        });

        hasNextPage = response.data.location.inventoryLevels.pageInfo.hasNextPage;
        after = response.data.location.inventoryLevels.pageInfo.endCursor;


        // // console.log(response.data.location.inventoryLevels.edges[0])
        // const inventoryLevels = response.data.location.inventoryLevels.edges.map((edge: any) => edge.node);
        // const productIds = extractProductIdsFromInventoryLevels(inventoryLevels);
        // // console.log(productIds)

        // // allInventoryLevels.push(...inventoryLevels);

        // // inventoryLevels.forEach(level => {
        // //     level.item.variants.edges.forEach(variant => {
        // //         productIds.add(variant.node.product.id);
        // //     });
        // // });

        // hasNextPage = response.data.location.inventoryLevels.pageInfo.hasNextPage;
        // after = response.data.location.inventoryLevels.pageInfo.endCursor;

      } catch (error: any) {
        console.error('Error fetching inventory levels:', error);
        setError(error.message);
        hasNextPage = false;
      } finally {
        setIsLoading(false);
      }
    }

    setInventoryLevels(allInventoryLevels);
    setProductIds(Array.from(productIds));

    // setProductIds(Array.from(productIds));
    // console.log(Array.from(productIds))
  };


  const selectLocation = (location: LocationType) => {
    setSelectedLocation(location);

    // once they select a location, lets get all of the inventory
    // currently commented out because we only have the UW store
    // fetchInventoryLevelsByLocation(location.id);
  };

  const resetLocation = () => {
    setSelectedLocation(null);
    // reset the inventory levels
    setInventoryLevels([])
  };

  const isLocationOpen = async (locationId: string) => {
    const query = `
        query {
          location(id: "${locationId}") {
            metafield(namespace: "custom", key: "isOpen") {
              value
            }
          }
        }
      `;

    try {
      const response: any = await adminApiClient(query);
      if (response.errors && response.errors.length !== 0) {
        throw new Error(response.errors[0].message);
      }

      const isOpen = response.data.location.metafield.value === "true";
      return isOpen;
    } catch (error: any) {
      console.error('Error checking if location is open:', error);
      throw new Error(error.message);
    }

  }

  const updateLocationStatus = (locationId: string, isOpen: boolean) => {
    setLocations(prevLocations => prevLocations.map(location =>
      location.id === locationId ? { ...location, isOpen } : location
    ));
  };




  return (
    <LocationsContext.Provider value={{ locations, selectedLocation, inventoryLevels, productIds, isLoading, error, selectLocation, resetLocation, isLocationOpen, updateLocationStatus }}>
      {children}
    </LocationsContext.Provider>
  );
};

export const useLocations = () => {
  const context = useContext(LocationsContext);
  if (context === undefined) {
    throw new Error('useLocations must be used within a LocationsProvider');
  }
  return context;
};
