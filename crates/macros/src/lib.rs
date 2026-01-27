extern crate proc_macro;
use proc_macro::TokenStream;
use quote::quote;
use syn::punctuated::Punctuated;
use syn::{Expr, ItemFn, Lit, Meta, Token, parse_macro_input};

#[proc_macro_attribute]
pub fn command(attr: TokenStream, item: TokenStream) -> TokenStream {
    // Parse the input function
    let input = parse_macro_input!(item as ItemFn);
    let name = &input.sig.ident;
    let name_str = name.to_string();

    // Default values
    let mut command_name = name_str.clone();
    let mut aliases = Vec::new();
    let mut global_cooldown = 0u64;
    let mut user_cooldown = 0u64;
    let mut mod_only = false;

    // Parse attributes
    // Use parse_terminated for comma-separated list
    let args = parse_macro_input!(attr with Punctuated::<Meta, Token![,]>::parse_terminated);

    for arg in args {
        match arg {
            Meta::NameValue(name_value) => {
                if name_value.path.is_ident("name") {
                    if let Expr::Lit(expr_lit) = name_value.value {
                        if let Lit::Str(lit_str) = expr_lit.lit {
                            command_name = lit_str.value();
                        }
                    }
                } else if name_value.path.is_ident("global_cooldown") {
                    if let Expr::Lit(expr_lit) = name_value.value {
                        if let Lit::Int(lit_int) = expr_lit.lit {
                            global_cooldown = lit_int.base10_parse().unwrap_or(0);
                        }
                    }
                } else if name_value.path.is_ident("user_cooldown") {
                    if let Expr::Lit(expr_lit) = name_value.value {
                        if let Lit::Int(lit_int) = expr_lit.lit {
                            user_cooldown = lit_int.base10_parse().unwrap_or(0);
                        }
                    }
                }
            }
            Meta::List(meta_list) => {
                if meta_list.path.is_ident("aliases") {
                    // aliases("a", "b")
                    // parse the tokens inside parens
                    let nested_lits: Result<Punctuated<Lit, Token![,]>, _> =
                        meta_list.parse_args_with(Punctuated::parse_terminated);
                    if let Ok(lits) = nested_lits {
                        for lit in lits {
                            if let Lit::Str(lit_str) = lit {
                                aliases.push(lit_str.value());
                            }
                        }
                    }
                }
            }
            Meta::Path(path) => {
                if path.is_ident("mod_only") {
                    mod_only = true;
                }
            }
        }
    }

    let struct_name = syn::Ident::new(&format!("{}_cmd", name), name.span());

    // aliases vec to token stream
    let aliases_tokens = aliases.iter().map(|a| quote! { #a });

    // Expand the code
    let expanded = quote! {
        // The implementation logic
        #input

        // The command struct
        #[derive(Clone, Copy)]
        #[allow(non_camel_case_types)]
        pub struct #struct_name;

        #[async_trait::async_trait]
        impl crate::commands::Command for #struct_name {
            fn name(&self) -> &'static str {
                #command_name
            }

            fn aliases(&self) -> Vec<&'static str> {
                vec![#(#aliases_tokens),*]
            }

            fn global_cooldown(&self) -> std::time::Duration {
                std::time::Duration::from_secs(#global_cooldown)
            }

            fn user_cooldown(&self) -> std::time::Duration {
                std::time::Duration::from_secs(#user_cooldown)
            }

            fn mod_only(&self) -> bool {
                #mod_only
            }

            async fn execute(&self, ctx: crate::commands::Context) -> anyhow::Result<()> {
                #name(ctx).await;
                Ok(())
            }
        }
    };

    TokenStream::from(expanded)
}
