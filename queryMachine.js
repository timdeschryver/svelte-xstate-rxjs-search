import { Machine, assign } from "xstate";

export const queryMachine = Machine(
  {
    id: "query",
    initial: "idle",
    context: {
      query: "",
      searchResults: undefined,
      errorMessage: undefined
    },
    states: {
      idle: {
        on: {
          INPUT: [{ target: "typing", cond: "isValidSearch" }]
        }
      },
      typing: {
        onEntry: [
          assign((ctx, event) => ({
            query: event.value
          })),
          "search"
        ],
        on: {
          INPUT: {
            actions: [
              assign((ctx, event) => ({
                query: event.value
              })),
              "search"
            ]
          },
          SEARCHING: {
            target: "waiting"
          }
        }
      },
      waiting: {
        on: {
          INPUT: [
            { target: "typing", cond: "isValidSearch" },
            { target: "idle" }
          ],
          SEARCH_SUCCESS: {
            target: "show_results",
            actions: [
              assign((ctx, event) => ({
                searchResults: event.items
              }))
            ]
          },
          SEARCH_FAILED: {
            target: "error_state",
            actions: [
              assign((ctx, event) => ({
                errorMessage: event.message
              }))
            ]
          }
        }
      },
      show_results: {
        on: {
          INPUT: [
            { target: "typing", cond: "isValidSearch" },
            { target: "idle" }
          ]
        }
      },
      error_state: {
        on: {
          INPUT: [
            { target: "typing", cond: "isValidSearch" },
            { target: "idle" }
          ]
        }
      }
    }
  },
  {
    guards: {
      isValidSearch: (context, evt) => !!evt.value
    }
  }
);
