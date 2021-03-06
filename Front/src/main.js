'use strict';

import Vue from 'vue';
import VueRouter from 'vue-router';
import VueResource from 'vue-resource';
import Vuex from 'vuex';
import VueSocketio from 'vue-socket.io';
import 'bootstrap/dist/css/bootstrap.min.css';
import Config from './config';
import store from './store';

Vue.use(VueRouter);
Vue.use(VueResource);
Vue.use(Vuex);
Vue.use(VueSocketio, Config.urlAPI);

const router = new VueRouter({
	mode: 'history',
	routes: [
		{
			name: 'home',
			path: '/',
			component: require('./view/home.vue')
		},
		{
			name: 'info',
			path: '/info/:id',
			component: require('./view/info.vue')
		},
		{
			name:'addInfo',
			path: '/newinfo/',
			component: require('./view/addInfo.vue')
		},	
		{
			name:'addInfoLocalized',
			path: '/newinfo/:location',
			component: require('./view/addInfo.vue')
		},
		{
			name: 'signIn',
			path: '/sign-in',
			component: require('./view/sign-in.vue')
		},
		{
			name: 'signUp',
			path: '/sign-up',
			component: require('./view/sign-up.vue')
		},
		{
			name: 'myProfile',
			path: '/profile',
			component: require('./view/profile.vue')
		},
		{
			name: 'userProfile',
			path: '/user/:id',
			component: require('./view/user.vue')
		},
		{
			name: 'about',
			path: '/about',
			component: require('./view/about.vue')
		},
		{
			name: 'contact',
			path: '/contact',
			component: require('./view/contact.vue')
		},
		{
			name: '404',
			path: '/*',
			component: require('./view/home.vue')
		}
	]
});

new Vue({
  el: '#app',
  store,
  router: router,
  render: h => h(require('./App.vue'))
});