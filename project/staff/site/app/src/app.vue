<template>
  <div id="app">
    <v-app class="grey lighten-2">
      <nav>
        <v-navigation-drawer v-model="navigationDrawerOpen" fixed clipped app class="grey lighten-4">
          <v-list>
            <v-list-item-group>
              <v-list-item v-for="route in filteredRoutes" :key="route.path" :to="route.path">{{ route.name }}
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-navigation-drawer>

        <v-app-bar app dense light class="primary">
          <v-app-bar-nav-icon @click="toggleNavigationDrawer()" color="secondary--text"></v-app-bar-nav-icon>
          <v-toolbar-title>AppName</v-toolbar-title>
          <v-toolbar-title class="sub-title">
            {{ currentRouteName }}
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-toolbar-items v-if="loggedIn">
            <route-btn to="/profile">
              <v-icon>account_box</v-icon>
            </route-btn>
          </v-toolbar-items>
          <v-toolbar-items v-else>
            <v-btn depressed color="primary">
              <a href="/api/auth" class="text--secondary">Login</a>
            </v-btn>
          </v-toolbar-items>
        </v-app-bar>
      </nav>

      <v-main>
        <v-container fluid>
          <div v-if="accessAllowed">
            <router-view/>
          </div>
          <div v-else>
            Access Denied
          </div>
        </v-container>
      </v-main>

    </v-app>
  </div>
</template>


<script lang="ts">
import routeBtn from '@/components/route_btn.vue';
import Vue from 'vue';
import {session, sessionAsync} from '@/session';
import {RouteEntryType, routes} from '@/router';
import {rpc} from '@/rpc';
import {rpcUserList} from '@/app/user/user_list';
import {rpcPermissionUserList} from '@/app/permission/permission_user_list';

export const deps = {sessionAsync};

function filteredRoutes(): { name: string, path: string }[] {
  function* filter(
      pathPrefix: string,
      namePrefix: string,
      routes: RouteEntryType[],
  ): Iterable<{ name: string, path: string }> {
    for (const route of routes) {
      // console.log(route);
      if (route.path.includes(':') || route.meta?.excludeFromSidebar) {
        continue;
      }

      if (route.children) {
        yield* filter(pathPrefix + route.path + '/', namePrefix + route.name + ':', route.children);
        continue;
      }

      const path = pathPrefix + route.path;
      const routePair = {path, name: namePrefix + route.name};

      if (!route.meta?.authz) {
        yield routePair;
        continue;
      }

      const si = session();

      if (si.userId) {
        const authz = route.meta.authz;
        if (authz(si)) {
          yield routePair;
        }
      }
    }
  }

  return Array.from(filter('', '', routes));
}

export const internal = {filteredRoutes};

export const app = Vue.extend({
  components: {
    routeBtn,
  },
  async created(): Promise<void> {
    // await internal.checkForRedirect(this.$router);
    // once we have the session data we can setup the App state.
    // console.log(Array.from(internal.filteredRoutes()));
    const si = await deps.sessionAsync();
    this.loading = false;
    this.loggedIn = !!si?.userId;
    console.log('rpc', rpc);
    const userList = await rpcUserList();
    if (userList) {
      for (const user of userList) {
        if (user.userId) {
          const perms = await rpcPermissionUserList(user.userId);
          console.log(user, perms);
        }
      }
    }

    // console.log(filteredRoutes());
  },
  data(): {
    navigationDrawerOpen: boolean,
    loggedIn: boolean,
    loading: boolean,
  } {
    return {
      navigationDrawerOpen: false,
      loggedIn: false,
      loading: true,
    };
  },
  methods: {
    toggleNavigationDrawer(): void {
      this.navigationDrawerOpen = !this.navigationDrawerOpen;
    },
  },
  computed: {
    filteredRoutes: internal.filteredRoutes,
    currentRouteName(): string {
      return this.filteredRoutes.find((r: { path: string }) => r.path === this.$route.path)?.name || '';
    },
    accessAllowed(): boolean {
      const authz = this.$router.currentRoute?.meta?.authz;
      if (authz === undefined) {
        return true;
      }
      return authz(session());
    },
  },
});

export default app;
</script>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  color: #2c3e50;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}

.v-toolbar__content {
  .sub-title {
    margin-left: 20px;
  }
}
</style>
