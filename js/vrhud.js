'use strict';

function VRHud() {
	var self = this;

	this.visible = false;
	this.hudItems = [];
	this.layout = new THREE.Group();
	this.layout.visible = this.visible;
	this.homeButtonMesh = null;
	this.d23 = null;
	this.enabled = false;

	function loadJson(url) {
		return new Promise( function(resolve, reject) {
			var xhr = new XMLHttpRequest();

			xhr.onload = function() {
				resolve(xhr.response);
			}

			xhr.onerror = function() {
				reject(new Error('Some kind of network error, XHR failed.'))
			}

			xhr.open('GET', url);
			xhr.send();
		})
	};

	var jsonLoaded = loadJson('json/favorites.json')
		.then( function(response) {
			return JSON.parse(response)
		}, function(err) {
			reject(new Error('Error parsing JSON ' + err));
		})
		.then ( function(parsed) {
			return parsed;
		})

	var d23 = new DOM2three.load('d23/hud', {
		makeMeshes: true,
		pixelScale: 0.003
	});
	this.d23 = d23;

	this.ready = Promise.all([d23.loaded, jsonLoaded]).then(function(result) {
		var meshNodes = result[0];
		var favorites = result[1].favorites;

		self.attachEvents.call(self, favorites);
		self.makeLayout.call(self, meshNodes);
	});

	return this;
};

VRHud.prototype.disable = function() {
	this.hide();
	this.enabled = false;
};

VRHud.prototype.enable = function() {
	this.enabled = true;
};

VRHud.prototype.show = function() {
	var self = this;

	return new Promise( function(resolve, reject) {
		if (!self.visible) {
			self.layout.visible = true;
			self.visible = true;

			var nodes = self.d23.getNodesByClass('fav');

			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				var mesh = node.mesh;


				mesh.position.set(mesh.userData.position.x, mesh.userData.position.y - 1, mesh.userData.position.z + 1);

				var tween = new TWEEN.Tween( mesh.position )
					.to({ x: mesh.userData.position.x, y: mesh.userData.position.y, z: mesh.userData.position.z}, 700 )
					.easing(TWEEN.Easing.Exponential.Out)
					.delay( i * 80 )
					.start();

				mesh.scale.set(mesh.userData.scale.x * 0.75, mesh.userData.scale.y * 0.75, mesh.userData.scale.z);

				var tween = new TWEEN.Tween( mesh.scale )
					.to({ x: mesh.userData.scale.x, y: mesh.userData.scale.y, z: mesh.userData.scale.z}, 500 )
					.easing(TWEEN.Easing.Exponential.Out)
					.delay( i * 80 )
					.start();

				mesh.material.opacity = 0;

				var tween = new TWEEN.Tween( mesh.material )
					.to({ opacity: 1}, 300 )
					.easing(TWEEN.Easing.Exponential.Out)
					.delay( i * 80 )
					.start();
			}

			self.layout.visible = true;
			self.visible = true;

			resolve();
		}
	});
};

VRHud.prototype.hide = function() {
	var self = this;
	return new Promise( function(resolve, reject) {
		if (self.visible) {
			var nodes = self.d23.getNodesByClass('fav');

			nodes.reverse();

			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				var mesh = node.mesh;

				mesh.material.opacity = 1;

				var tween = new TWEEN.Tween( mesh.material )
					.to({ opacity: 0 }, 500 )
					.easing(TWEEN.Easing.Exponential.Out)
					.delay( i * 80 )
					.onComplete(function() {
						self.layout.visible = false;
						self.visible = false;
						resolve();
					})
					.start();
			}
		} else {
			// already hidden, so resolve.
			resolve();
		}
	});
};

VRHud.prototype.attachEvents = function(favorites) {
	var self = this;
	var d23 = this.d23;

	favorites.forEach(function(favorite) {
		var node = d23.getNodeById(favorite.id);

		if (!node) {
			console.error('No node with id ' + favorite.id);
			return false;
		}

		var mesh = node.mesh;

		mesh.userData.url = favorite.url;

		mesh.addEventListener('mouseover', function(e) {
			var mesh = e.target;

			for (var i = 0; i < favorites.length; i++) {
				var m = d23.getNodeById(favorites[i].id).mesh;

				if (m !== mesh) {
					var material = m.material;
					var tween = new TWEEN.Tween( material.color )
						.to({ r: 0.6, g: 0.6, b: 0.6 }, 500 )
						.easing(TWEEN.Easing.Exponential.Out)
						.start();
				}
			}
		});

		mesh.addEventListener('mouseout', function(e) {
			var mesh = e.target;
			for (var i = 0; i < favorites.length; i++) {
				var m = d23.getNodeById(favorites[i].id).mesh;

				if (m !== mesh) {
					var material = m.material;
					var tween = new TWEEN.Tween( material.color )
						.to({ r: 1, g: 1, b: 1 }, 500 )
						.easing(TWEEN.Easing.Exponential.Out)
						.start();
				}
			}
		});

		mesh.addEventListener('click', function(e) {
			var target = e.target;

			if (self.enabled) {
				VRManager.ui.load(target.userData.url);
			}
		});

	});
}

VRHud.prototype.makeLayout = function(nodes) {
	var self = this;

	var layout = self.layout;

	var favorites = [];
	this.favorites = favorites;

	return new Promise( function(resolve, reject) {
		nodes.forEach( function(node) {
			var mesh = node.mesh;
			// persist the current position so we can use it later.
			mesh.userData.position = new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z);

			mesh.userData.scale = new THREE.Vector3(mesh.scale.x, mesh.scale.y, mesh.scale.z);

			layout.add( mesh );
		});

		layout.position.set(0, -0.15, 0);

		resolve();
	});
}