import { useLocations } from '../context/LocationsContext';
import { storefrontApiClient } from '../utils/storefrontApiClient';


// returns the unfiltered collection
export const fetchCollection = async (collectionID: string, cursor: string | null, limit: number) => {
  try {
    const query = `
      query($collectionID: ID!, $cursor: String, $limit: Int!) {
        collection(id: $collectionID) {
          id
          title
          products(first: $limit, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              title
              description
              vendor
              availableForSale
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 10) {
                nodes {
                  url
                  width
                  height
                }
              }
              options {
                id
                name
                values
              }
              variants(first: 200) {
                nodes {
                  availableForSale
                  selectedOptions {
                    value
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      collectionID: collectionID,
      cursor: cursor,
      limit: limit,

      // collectionID: `gid://shopify/Collection/${collectionID}`,
      // numToFetch,
    };

    const response: any = await storefrontApiClient(query, variables);

    if (response.errors && response.errors.length !== 0) {
      throw new Error(response.errors[0].message);
    }

    // console.log(response ? response : "we got nothing burh!!!!");

    const products = response.data.collection.products.nodes;
    // // console.log(products);
    // console.log(response.data.collection.products.pageInfo);

    // cannot filter in this query, need to do it in the FC
    // const unfilteredProducts = response.data.collection.products.nodes;

    // const products = unfilteredProducts.filter(product => productIds.includes(product.id))

    const hasNextPage = response.data.collection.products.pageInfo.hasNextPage;

    const endCursor = response.data.collection.products.pageInfo.endCursor;


    return { products, hasNextPage, endCursor };
  } catch (error) {
    console.error('Error fetching collection:', error);
    throw error;
  }
};