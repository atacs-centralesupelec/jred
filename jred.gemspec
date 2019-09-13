# coding: utf-8

Gem::Specification.new do |spec|
  spec.name          = "caradoc-web"
  spec.version       = "0.1.0"
  spec.authors       = ["Arnaud Gallant"]
  spec.email         = ["arnaud.gallant@centralesupelec.fr"]

  spec.summary       = %q{PhD Job Fair in Saclay.}
  spec.homepage      = "https://www.caradoc-paris-saclay.fr"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r{^(_layouts|_includes|_sass|LICENSE|README)/i}) }

  spec.add_development_dependency "jekyll", "~> 3.2"
  spec.add_development_dependency "bundler", "~> 1.12"
  spec.add_development_dependency "rake", "~> 10.0"
end
